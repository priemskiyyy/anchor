# @priemskiyyy/anchor-better-auth

Better Auth sessions for Anchor, over the Better Auth client your application created, in the browser and on React Native with Better Auth's Expo plugin. The adapter subscribes to the client's session atom, the one behind `useSession` in every framework, publishes each settled change, and reads through that same atom. It answers the cookie session as an Anchor session of its user, and ends the session by signing it out on the server. Better Auth sessions are cookies, so the adapter declares no token profiles. Signing in, organizations and every other flow stay with `anchor.native`, which is your client.

Version 0.1.0 is an initial preview. APIs may change before 1.0. See the [verification limits](https://github.com/priemskiyyy/anchor/blob/main/docs/verification.md) before adopting an adapter.

## Installation

```sh
pnpm add @priemskiyyy/anchor @priemskiyyy/anchor-better-auth better-auth
```

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

- Every read is the session atom's own fetch, the one the Expo plugin restores its cached session in. So a start without a network answers the session the plugin cached, as `useSession` shows it, instead of `unavailable`; a start with a network waits for the server, which may have ended that session.
- A sign-in, a sign-out or an update through the client reaches the session at once. The plugin also refetches when the app returns to the foreground, so the `appState()` hint of `@priemskiyyy/anchor-react-native` is optional here.
- Ending offline still ends the session on the device: the plugin clears the stored cookie and the cached session before it asks the server, so `session.end()` answers `{ local: "completed", remote: "unknown", navigation: null }`. The server's session stays until it expires or is revoked from another device.
- API calls carry the cookie from `await authClient.getCookie()` in a `cookie` header, as Better Auth's Expo guide shows; the adapter still declares no token profile.

## Options

| Option | Type                    | Default                   | What it does                                                                            |
| ------ | ----------------------- | ------------------------- | --------------------------------------------------------------------------------------- |
| `sdk`  | the Better Auth client  | required                  | The client `createAuthClient()` returned, with its plugins.                             |
| `user` | `(user: User) => TUser` | a snapshot of core fields | Maps the Better Auth user, plugin fields included, to the plain data a session carries. |

Keep the mapper's result plain data. Anchor compares users by value and a `Date` never equals a new one, so a mapper that keeps `createdAt` publishes an update after every read.

## Capabilities

| Capability           | Better Auth                                                                                                                                                   |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Observation          | Push, through the session atom: sign-ins, sign-outs and updates through the client, window focus or the app returning to the foreground, other tabs, polling. |
| Token profiles       | None: API calls carry the session cookie.                                                                                                                     |
| Forced refresh       | Not applicable.                                                                                                                                               |
| End                  | Local and remote: `signOut()` deletes the session on the server and expires its cookie. Offline on React Native: local only, remote unknown.                  |
| Navigation after end | Never.                                                                                                                                                        |
| Runtimes             | Browsers, React Native and Expo with `@better-auth/expo`, Node.                                                                                               |

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

Better Auth exposes no issuer to the client, so the authority is `better-auth` for every deployment; its user ids are random, so two deployments in one application do not collide in practice. The session's token never leaves the adapter.

## Tokens

None: Better Auth sessions are cookies, so the adapter declares no token profiles and your API calls carry the session cookie.

## Ending the session

`session.end()` refreshes the session atom and calls `signOut()` only while it still holds the session's user, organization, team and Better Auth session. It then answers `{ local: "completed", remote: "completed", navigation: null }`. When the client holds another session, it signs nobody out and answers `not-applicable`. A sign-out that fails while the client still holds the session, such as one in a browser without a network, rejects with `END_FAILED` and the error as its `cause`, and the session stays signed in until a read says otherwise. On React Native, where the Expo plugin clears the session on the device first, a failed sign-out answers `{ local: "completed", remote: "unknown", navigation: null }`. To end the user's other sessions, call `anchor.native.revokeOtherSessions()` yourself.

## Server reads

To read a request's session on the server, use [`@priemskiyyy/anchor-better-auth-node`](../better-auth-node), which reads it through the server's `auth` instance for `getRequestSession` from `@priemskiyyy/anchor-server` and maps it exactly as this adapter does.

## What Anchor does not normalize

Sign-in methods, social and magic-link flows, email verification, two-factor challenges, organization and team switching, multi-session switching, anonymous account linking and user updates stay with Better Auth. Read them through `anchor.native`, and the session atom reports the session they leave behind.

## Behavior

- The factory is cold: creating the adapter touches nothing on the client.
- Every read is the atom's own `refetch()`, never a second request beside it, so the atom and the session never disagree. A read that fails while the client holds no session makes the first state `unavailable`, never `signed-out`; one that fails while the client still holds a session, the one it answered last or the Expo plugin's cache, answers that session.
- A 401 is no session: Better Auth answers it after deleting a session cookie it could not refresh, and its own atom reads it the same way.
- The atom's pending and refetching values repeat the data it held before the fetch, and a failed fetch keeps it, so none of them is published.
- A read that outlives Anchor's timeout stops waiting for the atom and leaves no listener behind.
- `dispose()` unsubscribes from the session atom.

## Tests

Unit tests run over an in-process fake modelled on better-auth 1.7.6, including the conformance suite. The contracts file typechecks the real React and vanilla clients with the organization, anonymous and admin plugins. The real client runs in Node against a real Better Auth server on a memory database: a sign-up reaches the session through the atom, and ending signs it out on the server. On React Native's terms, the real React client with the real Expo plugin runs against a real server with the `expo()` plugin, with only `react-native`, `expo-constants`, `expo-linking` and `expo-network` replaced and secure storage in memory: a sign-up, a restart from secure storage, an offline restart from the plugin's cache, and an offline ending. It was not run on a device.

## License

MIT
