---
description: "Better Auth sessions for Anchor's server reads: each request is read through your server's auth.api.getSession from its own cookies, answered with the headers Better Auth sets, and mapped exactly as the client adapter maps it."
---

# Better Auth on the server

`@priemskiyyy/anchor-better-auth-node` is a server adapter for [`@priemskiyyy/anchor-server`](../server-rendering.md). Each request is read through the `auth` instance your server created with `betterAuth()` from `better-auth`, from that request's own cookies, and answered with the headers Better Auth wants set on the response, such as a refreshed session cookie. A session maps exactly as [`@priemskiyyy/anchor-better-auth`](better-auth.md) maps it in the browser or on React Native, so one user is one principal on both sides.

## Install

```sh
pnpm add @priemskiyyy/anchor @priemskiyyy/anchor-server @priemskiyyy/anchor-better-auth-node better-auth
```

The adapter supports better-auth 1.

## Read a request

```ts
import { betterAuth } from "@priemskiyyy/anchor-better-auth-node";
import { getRequestSession } from "@priemskiyyy/anchor-server";

import { auth } from "./auth";

const adapter = betterAuth({ sdk: auth });

export const handleRequest = async (request: Request) => {
  const { state, headers } = await getRequestSession(request, { adapter });

  if (state.status === "unavailable") {
    return new Response("Try again shortly.", { status: 503, headers });
  }

  return new Response(renderPage(state), { headers });
};
```

Pass `headers` on in every branch: Better Auth refreshes and deletes cookies through them. The file that creates `auth` with `betterAuth` from `better-auth` usually differs from the one that reads requests; where one file needs both, rename one import.

## Options

| Option | Type                    | Default                   | What it does                                                                            |
| ------ | ----------------------- | ------------------------- | --------------------------------------------------------------------------------------- |
| `sdk`  | the server's `auth`     | required                  | The instance `betterAuth()` from `better-auth` returned, with its plugins.              |
| `user` | `(user: User) => TUser` | a snapshot of core fields | Maps the Better Auth user, plugin fields included, to the plain data a session carries. |

Use the same `user` mapper as the client adapter, so a page rendered on the server and the Anchor in the browser carry the same user.

## Capabilities

| Capability       | Better Auth on the server                                                                                                |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Reads            | `auth.api.getSession({ headers, returnHeaders: true })`, once per request, from the request's own headers.               |
| Response headers | The headers Better Auth answers, such as a refreshed session cookie, or the deletions of a session it could not refresh. |
| Tokens           | None: a request's session has no `getToken`. Tokens and endings belong to the client's Anchor.                           |
| Runtimes         | Wherever your Better Auth server runs.                                                                                   |

## How a session is mapped

As the client adapter maps it: the authority is `better-auth`, the subject is `user.id`, the context fingerprints `session.activeOrganizationId`, `session.activeTeamId` and `session.id`, `guest` is `user.isAnonymous` and `impersonated` is `session.impersonatedBy` being set. The request's session carries `principal`, `user`, `guest` and `impersonated`; its key, tokens and ending belong to the client's Anchor.

## Tokens and ending

A request's session mints nothing and ends nothing: `getRequestSession` answers a state without `key`, `getToken` or `end`. The browser's Anchor, over [`@priemskiyyy/anchor-better-auth`](better-auth.md), ends the session with `signOut()`.

## Behavior

- Each read calls `auth.api.getSession({ headers, returnHeaders: true })` with the request's own headers, and holds nothing between requests.
- The headers Better Auth answers come back in `headers`, an empty `Headers` when it answers none.
- The 401 Better Auth throws after deleting a session it could not refresh is `signed-out`, and the cookie deletions it set before throwing still reach `headers`, so the browser drops the dead session. Any other failure is `unavailable`, with the error as its `cause`, and keeps the headers Better Auth set too.
- The factory is cold: creating the adapter touches nothing on `auth`.

## What Anchor does not normalize

Everything but reading the session stays with Better Auth: signing in and out, creating and revoking sessions, cookie settings and every plugin's endpoints. Call them through your `auth`.

The adapter passes the server conformance suite against a real Better Auth server on a memory database, and a parity test checks that it and the client adapter answer the same principal, user and flags; see the [verification matrix](../verification.md). The [package README](https://github.com/priemskiyyy/anchor/tree/main/packages/adapters/better-auth-node#readme) is the reference.
