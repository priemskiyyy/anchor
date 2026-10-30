# @priemskiyyy/anchor-clerk-node

Request-scoped Clerk sessions for Anchor's server reads. Each request's headers are authenticated with `authenticateRequest()` of the `@clerk/backend` client your server created, its user is fetched from Clerk's Backend API, and the answer carries the headers Clerk wants set on the response. A session maps as [`@priemskiyyy/anchor-clerk`](../clerk) maps the same session in the browser, so one user is one principal on both sides.

Version 0.1.1 is an initial preview. APIs may change before 1.0. See the [verification limits](https://github.com/priemskiyyy/anchor/blob/main/docs/verification.md) before adopting an adapter.

## Installation

```sh
pnpm add @priemskiyyy/anchor @priemskiyyy/anchor-server @priemskiyyy/anchor-clerk-node @clerk/backend
```

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

  if (state.status === "unavailable") {
    return new Response("Try again shortly.", { status: 503, headers });
  }

  return new Response(renderPage(state), { headers });
};
```

Pass `headers` on in every branch: they carry the session cookie Clerk refreshes, and the `x-clerk-auth-status`, `x-clerk-auth-reason` and `x-clerk-auth-message` headers Clerk sets on every response it authenticates.

Clerk authenticates the request itself: its URL, its method and a copy of its headers, `Referer` and `X-Forwarded-*` included, as Clerk's own middleware would see them, so its handshake returns the browser to the page it asked for.

## Options

| Option              | Type                    | Default                          | What it does                                                                                                    |
| ------------------- | ----------------------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `sdk`               | `ClerkClient`           | required                         | The client `createClerkClient()` returned, with your secret key, publishable key and, if you use one, `jwtKey`. |
| `authorizedParties` | `string[]`              | none                             | The origins your pages are served from, which Clerk checks each session token's `azp` claim against.            |
| `user`              | `(user: User) => TUser` | a snapshot of the profile fields | Maps the Backend API's `User` to the plain data a session carries.                                              |

## How a session is mapped

As the client adapter maps it: the authority is the session token's issuer, `https://<frontendApi>`, the subject is the user's id, the tenant is `null`, and the context fingerprints the active organization, the Clerk session's id and the actor's `sub`. `impersonated` is an actor being set and `guest` is `false`. The default user is `{ id, externalId, username, firstName, lastName, fullName, imageUrl, primaryEmailAddress, primaryPhoneNumber }` from the Backend API's `User`, with the primary email address and phone number as the strings they hold, or `null`.

Where the two sides differ:

- A pending session is `action-required` with `action.kind` `pending`: the session token says a session is pending, but not which task, so the client adapter's `choose-organization` or `setup-mfa` is not visible on the server.
- The organization and the actor are the session token's, minted at most a minute before, while the client adapter reads the session clerk-js holds now, so an organization switch reaches the client first.
- The user is the Backend API's, as Clerk holds it at the read, while the client adapter's is the one clerk-js last loaded.
- A session ended elsewhere still reads as signed in until its session token expires, since Clerk verifies the token without asking Clerk.

## The handshake

Clerk's session tokens live for a minute, and a page navigation whose token has expired needs Clerk's handshake, a redirect through Clerk's Frontend API that refreshes the session's cookies, before Clerk can tell who is signed in. So does a navigation from another site to a signed-in page, which Clerk syncs across domains. Such a read is `unavailable` with `INTERACTION_REQUIRED`, and `headers` carries the handshake: the `Location` of the redirect, `Cache-Control: no-store` and Clerk's cookies. Answer it with a redirect, as Clerk's middleware would:

<!-- snippet: fragment -->

```ts
if (
  state.status === "unavailable" &&
  state.error.code === "INTERACTION_REQUIRED"
) {
  return new Response(null, { status: 307, headers });
}
```

## Behavior

- A request Clerk finds no session in is `signed-out`: no session token and no client cookie, a client cookie that says it holds none, and a token that is forged, for a party you did not authorize, issued before the client's last change, not a session token, or expired outside a page navigation.
- A signed-out answer whose reason says Clerk could not verify the token is `unavailable`, never `signed-out`: `unexpected-error`, which is what a network failure fetching Clerk's keys comes to, `secret-key-invalid`, the `jwk-*` reasons for keys Clerk could not load, a clock that disagrees with the token's, the development and multi-domain syncs Clerk's middleware completes, and an expired session token whose refresh failed on the way: `session-token-expired-refresh-fetch-error`, `-unexpected-bapi-error`, `-unexpected-sdk-error`, `-invalid-session-token`, `-missing-api-client` and any outcome Clerk may add. Only an expired token with nothing to refresh it with, on a request Clerk refreshes only on a GET, or one that is no session token, is `signed-out`. Its `cause` is an error whose own `cause` is Clerk's request state.
- The headers Clerk answers reach `headers` whatever the read answers or throws: a refreshed session cookie, a handshake's redirect, and the `x-clerk-auth-*` headers of every answer.
- Each signed-in read asks the Backend API for the user with `users.getUser()`, one request that counts toward Clerk's rate limits; a failure there is `unavailable`, with Clerk's error as its `cause`.
- Each read holds nothing between requests, and the factory is cold: creating the adapter reads nothing on `sdk`.

## Tests

Unit tests run over an in-process fake modelled on `@clerk/backend` 3.18.1's `authenticateRequest()` and `users.getUser()`. The `testServerSessionAdapter` conformance suite from `@priemskiyyy/anchor-server/testing` runs over the fake and over the real `createClerkClient()`, which verifies RS256 session tokens signed with a local key through `jwtKey` and whose Backend API requests go through `fetch` to an in-process fake; its session ended elsewhere is read after the clock passes the token's minute. The real client also reads two users concurrently with an organization and an actor, reads a pending session as `action-required`, refuses a forged, an expired and an unauthorized-party token as `signed-out`, needs its handshake for a page navigation with an expired token and redirects back to that page, reads a form post with an expired token as `signed-out`, needs its cross-domain handshake for a navigation from another site, and makes a failed user lookup `unavailable`. The parity test runs both real SDKs in-process, in jsdom: the real clerk-js loads a session from an in-process fake of the Frontend API, the client adapter reads it and mints its session token, and this adapter verifies that token with the real `@clerk/backend` and fetches the same user from the fake Backend API, answering the same principal, user and flags. The contracts file typechecks the real `ClerkClient` and its `User`. Clerk's own Frontend and Backend APIs, the refresh-cookie flow, satellite domains, a failing key fetch (which Clerk retries with delays) and Clerk's middleware were not run.

## License

MIT
