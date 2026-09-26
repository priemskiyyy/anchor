---
description: "Auth.js sessions for Anchor over next-auth 4's client: reads ask the session endpoint itself so a failed request is never a sign-out, other tabs' broadcasts ask for a read, the cookie session needs no token profile, and ending signs out without a redirect."
---

# Auth.js

`@priemskiyyy/anchor-authjs` reads the `next-auth/react` client module of next-auth 4. It answers the cookie session the server gives `getSession()` as a session of the user id your `session` callback adds, reads it again whenever another tab broadcasts a change, and ends it with `signOut({ redirect: false })`, which never leaves the page. Auth.js sessions are cookies, so the adapter declares no token profiles. Signing in, providers, `SessionProvider` and every other flow stay with `anchor.native`, which is the module.

## Install

```sh
pnpm add @priemskiyyy/anchor @priemskiyyy/anchor-authjs next-auth
```

The adapter supports next-auth 4.24 and later, below 5.

## Create an Anchor

Auth.js leaves the user's id out of the client session, and a session without one is refused, never guessed from an email. Add it in the `session` callback of your Auth.js options:

```ts
import type { AuthOptions } from "next-auth";

export const authOptions: AuthOptions = {
  providers,
  callbacks: {
    // With JWT sessions, the token's subject is the user's id.
    session: ({ session, token }) => ({
      ...session,
      user: { ...session.user, id: token.sub ?? "" },
    }),
  },
};
```

With database sessions, take it from the user instead: `session: ({ session, user }) => ({ ...session, user: { ...session.user, id: user.id } })`. The id must be a string: write `String(user.id)` for a numeric one. Declare it on the session type, so a mapper sees it:

```ts
// next-auth.d.ts
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: { id: string } & DefaultSession["user"];
  }
}
```

Then, in the browser:

```ts
import { Anchor } from "@priemskiyyy/anchor";
import { authjs } from "@priemskiyyy/anchor-authjs";
import * as nextAuth from "next-auth/react";

export const anchor = new Anchor({ adapter: authjs({ sdk: nextAuth }) });

await anchor.start();
await anchor.native.signIn("credentials", {
  username,
  password,
  redirect: false,
});
await anchor.sync();
```

next-auth tells a session change only to the application's other tabs, through its broadcast in `localStorage`, and the adapter reads again on every such broadcast. A sign-in or a sign-out in the same tab is not broadcast there, so call `anchor.sync()` after it, or end the session with `session.end()`. `SessionProvider` refetches the session when the window regains focus; the [`visibility()`](../browser-lifecycle.md) hint does the same for Anchor.

## Options

| Option     | Type                               | Default                          | What it does                                                                                  |
| ---------- | ---------------------------------- | -------------------------------- | --------------------------------------------------------------------------------------------- |
| `sdk`      | `typeof import("next-auth/react")` | required                         | The `next-auth/react` module.                                                                 |
| `basePath` | `string`                           | `/api/auth`                      | Where Auth.js answers, the same `basePath` you give `SessionProvider`.                        |
| `user`     | `(session: Session) => TUser`      | a snapshot of the session's user | Maps the whole session, your callback's fields included, to the plain data a session carries. |

## Capabilities

| Capability           | Auth.js                                                                                                                        |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Observation          | Invalidation, through next-auth's broadcast from the other tabs. In the same tab, `anchor.sync()` after a sign-in or sign-out. |
| Token profiles       | None: API calls carry the session cookie.                                                                                      |
| Forced refresh       | Not applicable.                                                                                                                |
| End                  | Local: the server clears the session cookie. Remote: unknown, since a copy of a JWT session stays valid until it expires.      |
| Navigation after end | Never: `signOut({ redirect: false })`.                                                                                         |
| Runtimes             | Browsers.                                                                                                                      |

## How a session is mapped

| Session               | From the client session (`getSession()`)                         |
| --------------------- | ---------------------------------------------------------------- |
| `principal.authority` | `authjs`                                                         |
| `principal.subject`   | `user.id`, which your `session` callback adds                    |
| `principal.tenant`    | `null`                                                           |
| context               | `null`: the client session carries no session id or organization |
| `user`                | `{ id, name, email, image }`, or your mapper's result            |
| `guest`               | `false`                                                          |
| `impersonated`        | `false`                                                          |

The client session names no issuer, so the authority is `authjs` for every deployment; the subject is whatever your callback puts there, so keep it the user's stable id, never an email.

## Tokens

The adapter declares no token profile: an Auth.js session is its cookie, which your API calls carry. `session.getToken()` has no profile to accept.

## Ending the session

`session.end()` asks the server for the session and acts only while it still belongs to the session's user. It calls `signOut({ redirect: false })`, which posts the sign-out with its CSRF token, and asks for the session again, because next-auth resolves a sign-out the server refused, its CSRF check included, with the page the server answered instead of an error. A session that stayed rejects with `END_FAILED`; one that went answers `{ local: "completed", remote: "unknown", navigation: null }`. The server has cleared the session cookie, and it deletes a database session, but the client cannot tell which strategy you run, and a copy of a JWT session stays valid until it expires. When the server holds another user's session, the adapter signs nobody out and answers `not-applicable`. A sign-out request that fails rejects with `END_FAILED` and next-auth's error as its `cause`.

## Behavior

- The factory is cold: creating the adapter touches nothing on the module.
- `open` listens for next-auth's broadcast on `window`, and each one asks Anchor for a read; outside a browser it listens to nothing. `dispose()` removes the listener.
- A read asks `{basePath}/session` itself, the endpoint next-auth's `getSession()` calls, because `getSession()` answers `null` both when the server holds no session and when the request fails. The endpoint's empty answer is `signed-out`; a failed request is `unavailable` at the start and keeps the session later, as with every other adapter. Reads never broadcast, so tabs reading each other's broadcasts never echo them back.
- next-auth's own session route answers that empty session, with a 200, when your `jwt` or `session` callback throws, its database adapter fails or a JWT cannot be decoded: it logs `JWT_SESSION_ERROR` or `SESSION_ERROR` on the server and says nothing to the client. Such a failure therefore reads as `signed-out`, and only your server logs tell it apart. A JWT it cannot decode also has its cookie cleared, which is a sign-out.
- `sdk` is used for `signOut()`, which carries Auth.js's CSRF token, and to type the session.
- A session without `user.id` is outside the contract: the first state is then `unavailable` with `INVALID_ANSWER`.

## What Anchor does not normalize

Sign-in and its providers, `SessionProvider`, `useSession()` and its polling, `update()`, `getCsrfToken()`, `getProviders()`, your callbacks, the JWT and what it holds, and server-side `getServerSession()` stay with Auth.js. Read them through `anchor.native` and your server.

There is no server adapter for Auth.js yet: next-auth 4 exports no request-scoped read over a plain `Request`, and its server read answers `null` for a forged token, a throwing callback and a failing database alike, so it cannot tell no session from a failure. The adapter runs against a fake modelled on next-auth 4.24.15's `next-auth/react` and against the real client and server in jsdom; see the [verification matrix](../verification.md). The [package README](https://github.com/priemskiyyy/anchor/tree/main/packages/adapters/authjs#readme) is the reference.
