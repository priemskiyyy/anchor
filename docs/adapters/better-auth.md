---
description: "Better Auth sessions for Anchor over the client you created, in the browser and on React Native with the Expo plugin: the session atom pushes and serves every read, the cookie session needs no token profile unless your backend takes a bearer token, and ending signs out on the server."
---

# Better Auth

`@priemskiyyy/anchor-better-auth` observes the Better Auth client your application created, in the browser and on React Native with Better Auth's Expo plugin. It subscribes to the client's session atom, the one behind `useSession` in every framework, publishes each settled change, and reads through that same atom. It answers the cookie session as a session of its user, and ends the session by signing it out on the server. Better Auth sessions are cookies, so your API calls carry the cookie; a `sessionToken()` profile is there for a backend that takes the session's token as a bearer token. Signing in, organizations and every other flow stay with `anchor.native`, which is your client.

## Install

```sh
pnpm add @priemskiyyy/anchor @priemskiyyy/anchor-better-auth better-auth
```

The adapter supports better-auth 1.

## Create an Anchor

```ts
import { Anchor } from "@priemskiyyy/anchor";
import { betterAuth } from "@priemskiyyy/anchor-better-auth";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();

export const anchor = new Anchor({ adapter: betterAuth({ sdk: authClient }) });

await anchor.start();
await anchor.native.signIn.email({ email, password });
```

The client from `better-auth/client`, `/react`, `/vue`, `/svelte` or `/solid` works the same: they all share one session atom.

## React Native and Expo

Use the React client with the `expoClient` plugin from `@better-auth/expo/client`, which keeps the session cookie in secure storage because React Native has no cookie jar, and add the `expo()` plugin and your app's scheme on the server:

```ts
import { Anchor } from "@priemskiyyy/anchor";
import { betterAuth } from "@priemskiyyy/anchor-better-auth";
import { expoClient } from "@better-auth/expo/client";
import { createAuthClient } from "better-auth/react";
import * as SecureStore from "expo-secure-store";

export const authClient = createAuthClient({
  baseURL: "https://api.example.com",
  plugins: [
    expoClient({
      scheme: "myapp",
      storagePrefix: "myapp",
      storage: SecureStore,
    }),
  ],
});

export const anchor = new Anchor({ adapter: betterAuth({ sdk: authClient }) });
```

```ts
// On the server.
import { expo } from "@better-auth/expo";
import { betterAuth } from "better-auth";

export const auth = betterAuth({
  plugins: [expo()],
  trustedOrigins: ["myapp://"],
});
```

- Every read is the session atom's own fetch, the one the Expo plugin restores its cached session in. So a start without a network answers the session the plugin cached, as `useSession` shows it, instead of `unavailable`; a start with a network waits for the server, which may have ended that session; set `confirmation` to answer the cached session sooner.
- A sign-in, a sign-out or an update through the client reaches the session at once. The plugin also refetches when the app returns to the foreground, so the `appState()` hint of `@priemskiyyy/anchor-react-native` is optional here.
- Ending offline still ends the session on the device: the plugin clears the stored cookie and the cached session before it asks the server, so `session.end()` answers `{ local: "completed", remote: "unknown", navigation: null }`. The server's session stays until it expires or is revoked from another device.
- API calls carry the cookie from `await authClient.getCookie()` in a `cookie` header, as Better Auth's Expo guide shows, or declare a `sessionToken()` profile for a backend that takes a bearer token.

## Options

| Option         | Type                         | Default                   | What it does                                                                                                                                                                                |
| -------------- | ---------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sdk`          | the Better Auth client       | required                  | The client `createAuthClient()` returned, with its plugins.                                                                                                                                 |
| `user`         | `(user: User) => TUser`      | a snapshot of core fields | Maps the Better Auth user, plugin fields included, to the plain data a session carries.                                                                                                     |
| `confirmation` | `{ timeout: number }`        | none: wait for the server | Milliseconds a session the client holds while its fetch is in flight, such as the Expo plugin's cached one, waits for the server before it is answered unconfirmed. `0` answers it at once. |
| `tokens`       | `{ [name]: sessionToken() }` | none                      | The token profiles the adapter mints, by name.                                                                                                                                              |

A `confirmation` is for an app that must not look signed out on a slow network: the cached session is answered after the timeout and the server's answer replaces it, so a session the server ended is shown until then.

Keep the mapper's result plain data. Anchor compares users by value and a `Date` never equals a new one, so a mapper that keeps `createdAt` publishes an update after every read.

## Capabilities

| Capability           | Better Auth                                                                                                                                                                                              |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Observation          | Push, through the session atom: sign-ins, sign-outs and updates through the client, window focus or the app returning to the foreground, other tabs, polling.                                            |
| Token profiles       | Opt in: `sessionToken()`. Otherwise API calls carry the session cookie.                                                                                                                                  |
| Forced refresh       | Refreshes the session atom, then mints from what it holds.                                                                                                                                               |
| End                  | Local and remote: `signOut()` deletes the session on the server and expires its cookie. Offline on React Native: local only, remote unknown. Never waits more than two seconds for a slow session fetch. |
| Navigation after end | Never.                                                                                                                                                                                                   |
| Runtimes             | Browsers, React Native and Expo with `@better-auth/expo`, Node.                                                                                                                                          |

## How a session is mapped

| Session               | From Better Auth                                                                                                                            |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `principal.authority` | `better-auth`                                                                                                                               |
| `principal.subject`   | `user.id`                                                                                                                                   |
| `principal.tenant`    | `null`                                                                                                                                      |
| context               | `session.activeOrganizationId`, `session.activeTeamId` and `session.id`: another organization, another team or a new login is a new session |
| `user`                | `{ id, name, email, emailVerified, image }`, or your mapper's result                                                                        |
| `guest`               | `user.isAnonymous`, set by the anonymous plugin                                                                                             |
| `impersonated`        | `true` while `session.impersonatedBy` is set, by the admin plugin                                                                           |

Better Auth exposes no issuer to the client, so the authority is `better-auth` for every deployment; its user ids are random, so two deployments in one application do not collide in practice. The session's token leaves the adapter only through a `sessionToken()` profile you declared.

## Tokens

Better Auth sessions are cookies, so by default the adapter declares no token profile and your API calls carry the session cookie. For a backend that reads `Authorization: Bearer`, add Better Auth's `bearer()` plugin to the server and declare the `sessionToken()` profile:

```ts
import { Anchor } from "@priemskiyyy/anchor";
import { betterAuth, sessionToken } from "@priemskiyyy/anchor-better-auth";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();

export const anchor = new Anchor({
  adapter: betterAuth({ sdk: authClient, tokens: { api: sessionToken() } }),
});

await anchor.start();

const state = anchor.session.get();

if (state.status === "signed-in") {
  const token = await state.session.getToken("api");

  await fetch("https://api.example.com/projects", {
    headers: { authorization: `${token.scheme} ${token.value}` },
  });
}
```

- It answers `{ value: session.token, kind: "session-token", scheme: "Bearer" }`, the token of the session the client holds, read from the session atom without a request. The `bearer()` plugin signs it into the session cookie on the server, unless it sets `requireSignature`.
- `forceRefresh` refreshes the session atom first, so a session the server ended is refused.
- It rejects with `SESSION_CHANGED` when the client holds another user, organization, team or Better Auth session than the one asked for, and with `UNSUPPORTED` when the server does not send the session's token to the client.
- The token is the session itself, not a short-lived credential: it works until the session expires or is ended. Keep it out of logs and storage.

## Ending the session

`session.end()` refreshes the session atom, waiting at most two seconds for it, and calls `signOut()` only while it still holds the session's user, organization, team and Better Auth session; a slow network never holds up a sign-out, which then goes by the session the atom held. It then answers `{ local: "completed", remote: "completed", navigation: null }`. When the client holds another session, it signs nobody out and answers `not-applicable`. A sign-out that fails while the client still holds the session, such as one in a browser without a network, rejects with `END_FAILED` and the error as its `cause`, and the session stays signed in until a read says otherwise. On React Native, where the Expo plugin clears the session on the device first, a failed sign-out answers `{ local: "completed", remote: "unknown", navigation: null }`. To end the user's other sessions, call `anchor.native.revokeOtherSessions()` yourself.

## Behavior

- The factory is cold: creating the adapter touches nothing on the client.
- Every read is the atom's own `refetch()`, never a second request beside it, so the atom and the session never disagree. A read that fails while the client holds no session makes the first state `unavailable`, never `signed-out`; one that fails while the client still holds a session, the one it answered last or the Expo plugin's cache, answers that session.
- A 401 is no session: Better Auth answers it after deleting a session cookie it could not refresh, and its own atom reads it the same way.
- The atom's pending and refetching values repeat the data it held before the fetch, and a failed fetch keeps it, so none of them is published, unless a `confirmation` timeout answers a held session whose fetch is still in flight. Only a settled fetch ever answers no session.
- A read that outlives Anchor's timeout stops waiting for the atom and leaves no listener behind.
- `dispose()` unsubscribes from the session atom.

## What Anchor does not normalize

Sign-in methods, social and magic-link flows, email verification, two-factor challenges, organization and team switching, multi-session switching, anonymous account linking and user updates stay with Better Auth. Read them through `anchor.native`, and the session atom reports the session they leave behind.

The adapter runs against a fake modelled on better-auth 1.7.6, against a real Better Auth server in Node, and on React Native's terms against the real Expo plugin, never on a device; see the [verification matrix](../verification.md). Requests on a server are read by [Better Auth on the server](better-auth-node.md), which maps a session exactly as this adapter does. The [package README](https://github.com/priemskiyyy/anchor/tree/main/packages/adapters/better-auth#readme) is the reference.
