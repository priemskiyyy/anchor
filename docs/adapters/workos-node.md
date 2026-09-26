---
description: "WorkOS sessions for Anchor's server reads: each request's sealed session cookie is opened and verified with @workos-inc/node, an expired one is refreshed and its newly sealed cookie reaches the response even when the read fails later, and a session maps as the client adapter maps it."
---

# WorkOS on the server

`@priemskiyyy/anchor-workos-node` is a server adapter for [`@priemskiyyy/anchor-server`](../server-rendering.md). Each request's sealed session cookie is opened with `loadSealedSession()` of the `@workos-inc/node` client your server created and verified with `authenticate()`; an expired one is refreshed with `refresh()`, and the newly sealed session comes back as a `Set-Cookie` header for the response. A session maps as [`@priemskiyyy/anchor-workos`](workos.md) maps the same user in the browser, so one user is one principal on both sides.

## Install

```sh
pnpm add @priemskiyyy/anchor @priemskiyyy/anchor-server @priemskiyyy/anchor-workos-node @workos-inc/node
```

The adapter supports `@workos-inc/node` 10.

## Read a request

```ts
import { workos } from "@priemskiyyy/anchor-workos-node";
import { getRequestSession } from "@priemskiyyy/anchor-server";
import { WorkOS } from "@workos-inc/node";

import { workosApiKey, workosClientId, workosCookiePassword } from "./config";

const adapter = workos({
  sdk: new WorkOS(workosApiKey, { clientId: workosClientId }),
  cookiePassword: workosCookiePassword,
});

export const handleRequest = async (request: Request) => {
  const { state, headers } = await getRequestSession(request, { adapter });

  if (state.status === "unavailable") {
    return new Response("Try again shortly.", { status: 503, headers });
  }

  return new Response(renderPage(state), { headers });
};
```

Signing in, and sealing the session into the cookie with `session: { sealSession: true, cookiePassword }`, stay with your server. Pass `headers` on in every branch: a read that refreshes the session sets the newly sealed one in the cookie, and one whose refresh WorkOS refuses deletes it, each with the attributes WorkOS's session guide sets it with, `Path=/; HttpOnly; Secure; SameSite=Lax`.

## Options

| Option           | Type                    | Default                          | What it does                                                                        |
| ---------------- | ----------------------- | -------------------------------- | ----------------------------------------------------------------------------------- |
| `sdk`            | `WorkOS`                | required                         | The client your server created with its API key and client id.                      |
| `cookiePassword` | `string`                | required                         | The password your sealed sessions are sealed with.                                  |
| `cookie`         | `string`                | `wos-session`                    | The cookie that carries the sealed session, as AuthKit and WorkOS's guides name it. |
| `user`           | `(user: User) => TUser` | a snapshot of the profile fields | Maps the WorkOS `User` to the plain data a session carries.                         |

## Capabilities

| Capability       | WorkOS on the server                                                                                                          |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Reads            | `loadSealedSession()` and `authenticate()`, and `refresh()` for a session whose access token no longer verifies.              |
| Response headers | The newly sealed cookie of a refresh, kept when a later step fails, or its deletion when WorkOS refuses the refresh for good. |
| Tokens           | None: a request's session has no `getToken`. Tokens and endings belong to the client's Anchor.                                |
| Runtimes         | Wherever `@workos-inc/node` runs.                                                                                             |

## How a session is mapped

As the client adapter maps it: the authority is `workos`, the subject is the user's id, the tenant is `null`, and the context fingerprints the session's organization and the email of whoever impersonates its user, each `null` when there is none. `impersonated` is an impersonator being set, `guest` is `false`, and the default user is `{ id, email, emailVerified, firstName, lastName, profilePictureUrl, externalId }` with `null` for a missing external id.

Where the two sides differ: the server reads the user sealed into the cookie at the sign-in or the last refresh, while the client adapter reads the user AuthKit's last refresh in the browser answered, so a profile change reaches each side with its own next refresh. And the server verifies the session's access token without asking WorkOS, so a session ended elsewhere still reads as signed in until that token expires, when its refresh is refused and the read is `signed-out`.

## Tokens and ending

A request's session mints nothing and ends nothing. The browser's Anchor, over [`@priemskiyyy/anchor-workos`](workos.md), mints access tokens and signs out without navigating.

## Behavior

- A request without the sealed session cookie is `signed-out` without a call to WorkOS, and so is one `authenticate()` cannot open with `cookiePassword`, which WorkOS answers `invalid_session_cookie`.
- A session whose access token no longer verifies, which `authenticate()` answers `invalid_jwt`, is refreshed. A refresh WorkOS refuses for good, such as `invalid_grant`, `mfa_enrollment` or `sso_required`, is `signed-out`, and the response deletes the cookie. One that failed for a reason that may pass, a rate limit, a timeout, a `5xx` or the network, is `unavailable`, with WorkOS's error as its `cause`, and keeps the cookie.
- A failure to fetch WorkOS's keys, which `authenticate()` throws, is `unavailable` too.
- The newly sealed session of a refresh is set in `headers` before the session is mapped, so a read that fails after the refresh, in your `user` mapper for one, is `unavailable` and still hands the browser the new cookie, since WorkOS has spent the old refresh token.
- Each read holds nothing between requests, and the factory is cold: creating the adapter reads nothing on `sdk`.

## What Anchor does not normalize

Signing in, AuthKit's code exchange, sealing the session into its cookie, signing out through WorkOS's logout URL, organizations, roles and permissions, and every other WorkOS API stay with `@workos-inc/node` and your server. The adapter only opens, verifies and refreshes the session a request's cookie carries.

The adapter passes the server conformance suite over a fake modelled on `@workos-inc/node` 10.13.0 and over the real `WorkOS` client against an in-process fake of WorkOS's API, and a parity test runs both real SDKs in-process, in jsdom, and checks that it and the client adapter answer the same principal, user and flags; WorkOS's own API was not run. See the [verification matrix](../verification.md). The [package README](https://github.com/priemskiyyy/anchor/tree/main/packages/adapters/workos-node#readme) is the reference.
