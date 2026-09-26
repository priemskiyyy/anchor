---
description: "Clerk sessions for Anchor's server reads: authenticateRequest() of @clerk/backend reads each request with its URL, method and headers, a handshake is unavailable with INTERACTION_REQUIRED and its redirect in the headers, and a session maps as the client adapter maps it."
---

# Clerk on the server

`@priemskiyyy/anchor-clerk-node` is a server adapter for [`@priemskiyyy/anchor-server`](../server-rendering.md). Each request's headers are authenticated with `authenticateRequest()` of the `@clerk/backend` client your server created, its user is fetched from Clerk's Backend API, and the answer carries the headers Clerk wants set on the response. A session maps as [`@priemskiyyy/anchor-clerk`](clerk.md) maps the same session in the browser, so one user is one principal on both sides.

## Install

```sh
pnpm add @priemskiyyy/anchor @priemskiyyy/anchor-server @priemskiyyy/anchor-clerk-node @clerk/backend
```

The adapter supports `@clerk/backend` 3.

## Read a request

```ts
import { createClerkClient } from "@clerk/backend";
import { clerk } from "@priemskiyyy/anchor-clerk-node";
import { getRequestSession } from "@priemskiyyy/anchor-server";

import { clerkPublishableKey, clerkSecretKey } from "./config";

const adapter = clerk({
  sdk: createClerkClient({
    secretKey: clerkSecretKey,
    publishableKey: clerkPublishableKey,
  }),
  authorizedParties: ["https://app.example.com"],
});

export const handleRequest = async (request: Request) => {
  const { state, headers } = await getRequestSession(request, { adapter });

  if (
    state.status === "unavailable" &&
    state.error.code === "INTERACTION_REQUIRED"
  ) {
    return new Response(null, { status: 307, headers });
  }

  if (state.status === "unavailable") {
    return new Response("Try again shortly.", { status: 503, headers });
  }

  return new Response(renderPage(state), { headers });
};
```

Pass `headers` on in every branch: they carry the session cookie Clerk refreshes, and the `x-clerk-auth-status`, `x-clerk-auth-reason` and `x-clerk-auth-message` headers Clerk sets on every response it authenticates. Clerk authenticates the request itself: its URL, its method and a copy of its headers, `Referer` and `X-Forwarded-*` included, as Clerk's own middleware would see them, so its handshake returns the browser to the page it asked for.

## The handshake

Clerk's session tokens live for a minute, and a page navigation whose token has expired needs Clerk's handshake, a redirect through Clerk's Frontend API that refreshes the session's cookies, before Clerk can tell who is signed in. So does a navigation from another site to a signed-in page, which Clerk syncs across domains. Such a read is `unavailable` with `INTERACTION_REQUIRED`, and `headers` carries the handshake: the `Location` of the redirect, `Cache-Control: no-store` and Clerk's cookies. Answer it with a redirect, as Clerk's middleware would, and as the first branch above does.

## Options

| Option              | Type                    | Default                          | What it does                                                                                                    |
| ------------------- | ----------------------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `sdk`               | `ClerkClient`           | required                         | The client `createClerkClient()` returned, with your secret key, publishable key and, if you use one, `jwtKey`. |
| `authorizedParties` | `string[]`              | none                             | The origins your pages are served from, which Clerk checks each session token's `azp` claim against.            |
| `user`              | `(user: User) => TUser` | a snapshot of the profile fields | Maps the Backend API's `User` to the plain data a session carries.                                              |

## Capabilities

| Capability       | Clerk on the server                                                                                                 |
| ---------------- | ------------------------------------------------------------------------------------------------------------------- |
| Reads            | `authenticateRequest()` with the request's URL, method and headers, then `users.getUser()` for a signed-in session. |
| Response headers | Clerk's, in every case: a refreshed session cookie, a handshake's redirect, and the `x-clerk-auth-*` headers.       |
| Blocked sessions | A pending session is `action-required` with `action.kind` `pending`.                                                |
| Tokens           | None: a request's session has no `getToken`. Tokens and endings belong to the client's Anchor.                      |
| Runtimes         | Wherever `@clerk/backend` runs.                                                                                     |

## How a session is mapped

As the client adapter maps it: the authority is the session token's issuer, `https://<frontendApi>`, the subject is the user's id, the tenant is `null`, and the context fingerprints the active organization, the Clerk session's id and the actor's `sub`. `impersonated` is an actor being set and `guest` is `false`. The default user is `{ id, externalId, username, firstName, lastName, fullName, imageUrl, primaryEmailAddress, primaryPhoneNumber }` from the Backend API's `User`, with the primary email address and phone number as the strings they hold, or `null`.

Where the two sides differ:

- A pending session is `action-required` with `action.kind` `pending`: the session token says a session is pending, but not which task, so the client adapter's `choose-organization` or `setup-mfa` is not visible on the server.
- The organization and the actor are the session token's, minted at most a minute before, while the client adapter reads the session clerk-js holds now, so an organization switch reaches the client first.
- The user is the Backend API's, as Clerk holds it at the read, while the client adapter's is the one clerk-js last loaded.
- A session ended elsewhere still reads as signed in until its session token expires, since Clerk verifies the token without asking Clerk.

## Tokens and ending

A request's session mints nothing and ends nothing. The browser's Anchor, over [`@priemskiyyy/anchor-clerk`](clerk.md), mints session tokens and signs out exactly its session.

## Behavior

- A request Clerk finds no session in is `signed-out`: no session token and no client cookie, a client cookie that says it holds none, and a token that is forged, for a party you did not authorize, issued before the client's last change, not a session token, or expired outside a page navigation.
- A signed-out answer whose reason says Clerk could not verify the token is `unavailable`, never `signed-out`: `unexpected-error`, which is what a network failure fetching Clerk's keys comes to, `secret-key-invalid`, the `jwk-*` reasons for keys Clerk could not load, a clock that disagrees with the token's, the development and multi-domain syncs Clerk's middleware completes, and an expired session token whose refresh failed on the way: `session-token-expired-refresh-fetch-error`, `-unexpected-bapi-error`, `-unexpected-sdk-error`, `-invalid-session-token`, `-missing-api-client` and any outcome Clerk may add. Only an expired token with nothing to refresh it with, on a request Clerk refreshes only on a GET, or one that is no session token, is `signed-out`. Its `cause` is an error whose own `cause` is Clerk's request state.
- The headers Clerk answers reach `headers` whatever the read answers or throws: a refreshed session cookie, a handshake's redirect, and the `x-clerk-auth-*` headers of every answer.
- Each signed-in read asks the Backend API for the user with `users.getUser()`, one request that counts toward Clerk's rate limits; a failure there is `unavailable`, with Clerk's error as its `cause`.
- Each read holds nothing between requests, and the factory is cold: creating the adapter reads nothing on `sdk`.

## What Anchor does not normalize

Clerk's middleware, such as `clerkMiddleware()`, the handshake's pages, satellite domains, the Backend API's user and organization management, and machine-to-machine tokens stay with `@clerk/backend` and your server. The adapter only authenticates the request and fetches its user.

The adapter passes the server conformance suite over a fake modelled on `@clerk/backend` 3.18.1 and over the real `createClerkClient()` with tokens signed by a local key, and a parity test runs both real SDKs in-process, in jsdom, and checks that it and the client adapter answer the same principal, user and flags; Clerk's own Frontend and Backend APIs were not run. See the [verification matrix](../verification.md). The [package README](https://github.com/priemskiyyy/anchor/tree/main/packages/adapters/clerk-node#readme) is the reference.
