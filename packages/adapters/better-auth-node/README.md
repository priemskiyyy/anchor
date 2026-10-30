# @priemskiyyy/anchor-better-auth-node

Request-scoped Better Auth sessions for Anchor's server reads. Each request is read through the `auth` instance your server created with `betterAuth()` from `better-auth`, from that request's own cookies, and answered with the headers Better Auth wants set on the response, such as a refreshed session cookie. A session maps exactly as [`@priemskiyyy/anchor-better-auth`](../better-auth) maps it in the browser or on React Native, so one user is one principal on both sides.

Version 0.1.1 is an initial preview. APIs may change before 1.0. See the [verification limits](https://github.com/priemskiyyy/anchor/blob/main/docs/verification.md) before adopting an adapter.

## Installation

```sh
pnpm add @priemskiyyy/anchor @priemskiyyy/anchor-server @priemskiyyy/anchor-better-auth-node better-auth
```

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

## How a session is mapped

As the client adapter maps it: the authority is `better-auth`, the subject is `user.id`, the context fingerprints `session.activeOrganizationId`, `session.activeTeamId` and `session.id`, `guest` is `user.isAnonymous` and `impersonated` is `session.impersonatedBy` being set. The request's session carries `principal`, `user`, `guest` and `impersonated`; its key, tokens and ending belong to the client's Anchor.

## Behavior

- Each read calls `auth.api.getSession({ headers, returnHeaders: true })` with the request's own headers, and holds nothing between requests.
- The headers Better Auth answers come back in `headers`, an empty `Headers` when it answers none.
- The 401 Better Auth throws after deleting a session it could not refresh is `signed-out`, and the cookie deletions it set before throwing still reach `headers`, so the browser drops the dead session. Any other failure is `unavailable`, with the error as its `cause`, and keeps the headers Better Auth set too.
- The factory is cold: creating the adapter touches nothing on `auth`.

## Tests

Unit tests run over an in-process fake modelled on better-auth 1.7.6's `auth.api.getSession`, and the `testServerSessionAdapter` conformance suite from `@priemskiyyy/anchor-server/testing` runs against a real Better Auth server. The contracts file typechecks a real server instance with the organization, anonymous and admin plugins. The adapter runs against a real Better Auth server on a memory database, with two users' requests read concurrently, a signed-out session's cookie read again, and a session whose refresh Better Auth refuses, whose three cookie deletions reach the response, and a parity test signs up through the real client and checks that the client adapter and this one answer the same principal, user and flags.

## License

MIT
