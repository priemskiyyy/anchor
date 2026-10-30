# @priemskiyyy/anchor-firebase

Firebase Auth sessions for Anchor, over the modular `Auth` instance your application initialized. The adapter observes `onIdTokenChanged`, answers the signed-in user as a session of your project's issuer, mints the user's ID token for each token profile, and ends the session with `signOut()`. It never initializes Firebase and never signs anyone in: that stays with `anchor.native`, which is your `Auth`.

Version 0.1.0 is an initial preview. APIs may change before 1.0. See the [verification limits](https://github.com/priemskiyyy/anchor/blob/main/docs/verification.md) before adopting an adapter.

## Installation

```sh
pnpm add @priemskiyyy/anchor @priemskiyyy/anchor-firebase firebase
```

## Create an Anchor

```ts
import { Anchor } from "@priemskiyyy/anchor";
import { firebase, idToken } from "@priemskiyyy/anchor-firebase";
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

const app = initializeApp(firebaseConfig);

export const anchor = new Anchor({
  adapter: firebase({ sdk: getAuth(app), tokens: { api: idToken() } }),
});

await anchor.start();
await signInWithPopup(anchor.native, new GoogleAuthProvider());
```

## Options

| Option   | Type                              | Default                          | What it does                                                                                            |
| -------- | --------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `sdk`    | `Auth`                            | required                         | The instance `getAuth(app)` or `initializeAuth(app)` returned.                                          |
| `user`   | `(user: User) => TUser`           | a snapshot of the profile fields | Maps the Firebase user to the plain data a session carries. Return plain data, never the `User` itself. |
| `tokens` | `Record<string, FirebaseIdToken>` | none                             | The token profiles, each `idToken()`.                                                                   |

## Capabilities

| Capability           | Firebase                                                                                                   |
| -------------------- | ---------------------------------------------------------------------------------------------------------- |
| Observation          | Push, through `onIdTokenChanged`: sign-in, sign-out, account linking and token refresh.                    |
| Token profiles       | `idToken()`: the user's Firebase ID token.                                                                 |
| Forced refresh       | Yes: `user.getIdToken(true)`.                                                                              |
| End                  | Local: `signOut()`. No remote step: the client cannot revoke refresh tokens.                               |
| Navigation after end | Never.                                                                                                     |
| Runtimes             | Browsers, and React Native through the Firebase JS SDK. `@react-native-firebase/auth` has its own adapter. |

## How a session is mapped

| Session               | From Firebase                                                                                |
| --------------------- | -------------------------------------------------------------------------------------------- |
| `principal.authority` | `https://securetoken.google.com/<projectId>`, the issuer of your ID tokens                   |
| `principal.subject`   | `user.uid`                                                                                   |
| `principal.tenant`    | `user.tenantId`, the Identity Platform tenant, or `null`                                     |
| `user`                | `{ uid, email, emailVerified, displayName, photoURL, phoneNumber }`, or your mapper's result |
| `guest`               | `user.isAnonymous`                                                                           |
| `impersonated`        | `false`                                                                                      |

Linking an anonymous user to an account keeps its `uid` but ends its guest session: Anchor replaces the session and gives it a new key.

## Tokens

`session.getToken(profile)` checks that `auth.currentUser` is still the session's user, then calls `getIdToken(forceRefresh)`. The token's `kind` is `id-token` and its `scheme` is `Bearer`. An expired credential (`auth/user-token-expired`) rejects with `INTERACTION_REQUIRED`; any other failure rejects with `TOKEN_FAILED` and the Firebase error as its `cause`.

## Ending the session

`session.end()` calls `signOut()` only while `auth.currentUser` is the session's user, and answers `{ local: "completed", remote: "not-applicable", navigation: null }`. When Firebase already holds someone else, it signs nobody out and answers `not-applicable`. To revoke a user's refresh tokens everywhere, use `revokeRefreshTokens` from the Admin SDK on your server.

## What Anchor does not normalize

Sign-in methods, account linking, multi-factor enrollment and challenges, email verification, custom claims, persistence settings, and ID token results (`getIdTokenResult`) stay with the Firebase SDK. Read them through `anchor.native`.

## Behavior

- The factory is cold: creating the adapter touches nothing on `Auth`.
- The first read awaits `authStateReady()`, so a user still being restored from persistence is `initializing`, never `signed-out`.
- An app whose options have no `projectId` cannot start: `start()` rejects with `START_FAILED` and an `INVALID_CONFIGURATION` cause.
- A user profile change made with `updateProfile` reaches the session on the next token change or `anchor.sync()`.
- `dispose()` removes the `onIdTokenChanged` listener.

## Tests

Unit tests run over an in-process fake modelled on firebase 12.19.0, including the conformance suite. The contracts file typechecks the real `Auth` and `User` types. The real SDK runs in Node with in-memory persistence and no user. Sign-in against Firebase's servers or an emulator was not run.

## License

MIT
