---
description: "Supabase Auth sessions for Anchor over the supabase-js client you created: onAuthStateChange pushes, accessToken() mints the session's access token for its own user only, and ending uses the local sign-out scope, never the global default."
---

# Supabase

`@priemskiyyy/anchor-supabase` observes the supabase-js client your application created. It answers the Supabase session as a session of its user, hears every change through `auth.onAuthStateChange`, mints the session's access token for each token profile, and ends only the current session with the `local` sign-out scope, never Supabase's `global` default. It never creates the client and never signs anyone in: that stays with `anchor.native`, which is your client.

## Install

```sh
pnpm add @priemskiyyy/anchor @priemskiyyy/anchor-supabase @supabase/supabase-js
```

The adapter supports supabase-js 2.

## Create an Anchor

```ts
import { Anchor } from "@priemskiyyy/anchor";
import { accessToken, supabase } from "@priemskiyyy/anchor-supabase";
import { createClient } from "@supabase/supabase-js";

const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const anchor = new Anchor({
  adapter: supabase({ sdk: client, tokens: { api: accessToken() } }),
});

await anchor.start();
await anchor.native.auth.signInWithOtp({ email });
```

## Options

| Option   | Type                                  | Default            | What it does                                                |
| -------- | ------------------------------------- | ------------------ | ----------------------------------------------------------- |
| `sdk`    | `SupabaseClient`                      | required           | The client `createClient()` returned.                       |
| `user`   | `(user: User) => TUser`               | the session's user | Maps the Supabase user to the plain data a session carries. |
| `tokens` | `Record<string, SupabaseAccessToken>` | none               | The token profiles, each `accessToken()`.                   |

## Capabilities

| Capability           | Supabase                                                                                                                                        |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Observation          | Push, through `onAuthStateChange`: `SIGNED_IN`, `SIGNED_OUT`, `TOKEN_REFRESHED`, `USER_UPDATED`, `PASSWORD_RECOVERY`, `MFA_CHALLENGE_VERIFIED`. |
| Token profiles       | `accessToken()`: the session's access token.                                                                                                    |
| Forced refresh       | Yes: `auth.refreshSession()`.                                                                                                                   |
| End                  | Local and remote: `auth.signOut({ scope: "local" })` revokes this session on the server and clears it here.                                     |
| Navigation after end | Never.                                                                                                                                          |
| Runtimes             | Browsers, React Native and Expo, Node.                                                                                                          |

## How a session is mapped

| Session               | From Supabase                                            |
| --------------------- | -------------------------------------------------------- |
| `principal.authority` | `supabase`                                               |
| `principal.subject`   | `session.user.id`                                        |
| `principal.tenant`    | `null`                                                   |
| context               | none                                                     |
| `user`                | a frozen copy of `session.user`, or your mapper's result |
| `guest`               | `session.user.is_anonymous`                              |
| `impersonated`        | `false`                                                  |

Supabase exposes neither the project URL nor the session id outside the access token, and Anchor does not decode tokens. The authority is therefore `supabase` for every project; user ids are UUIDs, so two projects in one application do not collide in practice.

## Tokens

`session.getToken(profile)` reads `auth.getSession()` and checks that it still belongs to the session's user. A forced request checks first and only then calls `auth.refreshSession()`, so it never refreshes another user's session. The token's `kind` is `access-token` and its `scheme` is the session's `token_type`. An error supabase-js answers with rejects with `TOKEN_FAILED` and that error as its `cause`.

## Ending the session

`session.end()` calls `auth.signOut({ scope: "local" })` only while supabase-js still holds the session's user, and answers `{ local: "completed", remote: "completed", navigation: null }`. When it holds someone else, it signs nobody out and answers `not-applicable`. A sign-out Supabase answers with an error rejects with `END_FAILED`, and the session stays signed in until a read says otherwise. To sign the user out on every device, call `anchor.native.auth.signOut({ scope: "global" })` yourself.

## Behavior

- The factory is cold: creating the adapter touches nothing on the client.
- The first state comes from `auth.getSession()`. `INITIAL_SESSION` is ignored, because supabase-js sends it with a `null` session when reading the stored session failed, which is no evidence of signing out.
- An error from `getSession()` during the first read makes the state `unavailable`, never `signed-out`.
- The callback given to `onAuthStateChange` is synchronous, as supabase-js asks to avoid deadlocks.
- A token refresh with an unchanged user publishes nothing; a `USER_UPDATED` keeps the session's key and updates its user.
- On React Native, supabase-js's own `startAutoRefresh` and `stopAutoRefresh` around `AppState` changes stay in your application.
- `dispose()` unsubscribes from `onAuthStateChange`.

## What Anchor does not normalize

Sign-in methods, one-time passwords, OAuth redirects, MFA enrollment and assurance levels, password recovery screens, identity linking and user metadata updates stay with supabase-js. Read them through `anchor.native`.

The adapter runs against a fake modelled on supabase-js 2.117.1 and the real client in Node; see the [verification matrix](../verification.md). Requests on a server are read by [Supabase on the server](supabase-node.md). The [package README](https://github.com/priemskiyyy/anchor/tree/main/packages/adapters/supabase#readme) is the reference.
