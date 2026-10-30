# @priemskiyyy/anchor-firebase-react-native

Firebase Authentication sessions for Anchor on React Native, over the `Auth` instance of `@react-native-firebase/auth` your application uses. The adapter observes `onIdTokenChanged`, answers the signed-in user as a session of your project's issuer, mints the user's ID token for each token profile only when the native SDK minted it for the session's user, and ends the session with `signOut()`. It never initializes Firebase and never signs anyone in: that stays with `anchor.native`, which is your `Auth`. In a browser, or with the Firebase JS SDK on React Native, use `@priemskiyyy/anchor-firebase` instead.

Version 0.1.0 is an initial preview. APIs may change before 1.0. See the [verification limits](https://github.com/priemskiyyy/anchor/blob/main/docs/verification.md) before adopting an adapter.

## Installation

```sh
pnpm add @priemskiyyy/anchor @priemskiyyy/anchor-firebase-react-native @react-native-firebase/app @react-native-firebase/auth
```

React Native Firebase needs its native modules: a development build or a bare app, never Expo Go.

## Create an Anchor

React Native Firebase 26 exports only its modular API, so pass the instance `getAuth()` returns:

```ts
import { Anchor } from "@priemskiyyy/anchor";
import { firebase, idToken } from "@priemskiyyy/anchor-firebase-react-native";
import {
  getAuth,
  signInWithEmailAndPassword,
} from "@react-native-firebase/auth";

export const anchor = new Anchor({
  adapter: firebase({ sdk: getAuth(), tokens: { api: idToken() } }),
});

await anchor.start();
await signInWithEmailAndPassword(anchor.native, email, password);
```

The sign-in reaches Anchor through `onIdTokenChanged`; nothing needs `anchor.sync()`.

## Options

| Option   | Type                              | Default                          | What it does                                                                                            |
| -------- | --------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `sdk`    | `Auth`                            | required                         | The instance `getAuth()` or `getAuth(app)` returned.                                                    |
| `user`   | `(user: User) => TUser`           | a snapshot of the profile fields | Maps the Firebase user to the plain data a session carries. Return plain data, never the `User` itself. |
| `tokens` | `Record<string, FirebaseIdToken>` | none                             | The token profiles, each `idToken()`.                                                                   |

## Capabilities

| Capability           | Firebase on React Native                                                                                                           |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Observation          | Push, through `onIdTokenChanged`: sign-in, sign-out, account linking and token refresh, as the native SDK reports them.            |
| Token profiles       | `idToken()`: the user's Firebase ID token.                                                                                         |
| Forced refresh       | Yes: `user.getIdTokenResult(true)`.                                                                                                |
| End                  | Local: `signOut()`, for this Firebase app on this device. No remote step: the client cannot revoke refresh tokens.                 |
| Navigation after end | Never.                                                                                                                             |
| Runtimes             | iOS and Android, through React Native Firebase's native modules. Browsers and the Firebase JS SDK: `@priemskiyyy/anchor-firebase`. |

## How a session is mapped

| Session               | From React Native Firebase                                                                                    |
| --------------------- | ------------------------------------------------------------------------------------------------------------- |
| `principal.authority` | `https://securetoken.google.com/<projectId>`, the issuer of your ID tokens, from `auth.app.options.projectId` |
| `principal.subject`   | `user.uid`                                                                                                    |
| `principal.tenant`    | `user.tenantId`, the Identity Platform tenant, or `null`                                                      |
| `user`                | `{ uid, email, emailVerified, displayName, photoURL, phoneNumber }`, or your mapper's result                  |
| `guest`               | `user.isAnonymous`                                                                                            |
| `impersonated`        | `false`                                                                                                       |

This is the mapping of `@priemskiyyy/anchor-firebase`, so one user is the same principal in a browser and in your app. Linking an anonymous user to an account keeps its `uid` but ends its guest session: Anchor replaces the session and gives it a new key.

## Tokens

`session.getToken(profile)` checks that `auth.currentUser` is still the session's user, then calls `user.getIdTokenResult(forceRefresh)` and answers its `token`. React Native Firebase asks the native SDK for the token of whichever user it holds when the call runs, not of the user the JavaScript `User` stood for, so the adapter answers the token only when the claims the native SDK decoded from it name the session's `uid`. A token minted for someone else rejects with `SESSION_CHANGED`, and so does a native SDK that already holds no user (`auth/no-current-user`). The token's `kind` is `id-token` and its `scheme` is `Bearer`. An expired credential (`auth/user-token-expired`) rejects with `INTERACTION_REQUIRED`; any other failure rejects with `TOKEN_FAILED` and the React Native Firebase error as its `cause`.

## Ending the session

`session.end()` calls `signOut()` only while `auth.currentUser` is the session's user and the native SDK, whose `signOut()` signs out whichever user it holds, still holds that user too, read from the claims of its ID token (or, when that token cannot be read, as offline with an expired one, from the mirror alone). A native switch between that check and `signOut()` is the window that remains. It answers `{ local: "completed", remote: "not-applicable", navigation: null }`. `signOut()` signs this Firebase app out on this device only. When React Native Firebase holds someone else, the adapter signs nobody out and answers `not-applicable`; so it does when the native SDK refuses with `auth/no-current-user` because it signed out before JavaScript heard of it. Any other refusal rejects with `END_FAILED`. To revoke a user's refresh tokens everywhere, use `revokeRefreshTokens` from the Admin SDK on your server. Signing out of Firebase does not sign out of the Google, Apple or Facebook SDK the user signed in with; that stays with them.

## What Anchor does not normalize

Sign-in methods and the native provider SDKs, phone auth and `verifyPhoneNumber`, account linking, multi-factor enrollment and challenges, email verification, custom claims, the iOS keychain access group (`useUserAccessGroup`), the emulator, and ID token results beyond the token stay with React Native Firebase. Read them through `anchor.native`.

## Behavior

- The factory is cold: creating the adapter touches nothing on `Auth`.
- The native SDK restores its user itself. The first read awaits `authStateReady()`, which settles once the native SDK reported its first auth state, so a user still being restored is `initializing`, never `signed-out`.
- An app whose options have no `projectId` cannot start: `start()` rejects with `START_FAILED` and an `INVALID_CONFIGURATION` cause.
- A user profile change made with `updateProfile` reaches the session on the next token change or `anchor.sync()`.
- React Native's `EventEmitter` calls its listeners in one loop without a catch, so a `user` mapper that throws while React Native Firebase reports a change asks Anchor for a read instead of keeping the change from your own listeners; the failed read is a diagnostic.
- React Native Firebase calls a listener it just added once on a microtask, even one removed before that; after `dispose()`, Anchor ignores that call.
- `dispose()` removes the `onIdTokenChanged` listener.

## Tests

- Unit tests run over an in-process fake modelled on `@react-native-firebase/auth` 26.4.0, including the conformance suite: its JavaScript mirror of the native user, `authStateReady`, the microtask call of a new listener, React Native's `EventEmitter` loop, `getIdTokenResult` minting for whichever user the native SDK holds, and the `auth/no-current-user` refusals of `getIdTokenResult` and `signOut`.
- The contracts file typechecks the real `Auth`, `User` and `getAuth` of 26.4.0 and pins the fake's members to theirs.
- The real JavaScript of `@react-native-firebase/app` and `@react-native-firebase/auth` 26.4.0 runs in Node over the module React Native Firebase registers for platforms without the native SDKs, which drives the Firebase JS SDK 12.17.1 it depends on, against in-process Identity Toolkit and Secure Token endpoints; only React Native's own modules, which are Flow source, are replaced. There: a first read waits for the user that module restores and never answers `signed-out`, an anonymous sign-in through the modular API is pushed and mints its ID token and a forced one through the refresh grant, a token the native side mints after it switched users, before the JavaScript heard of it, is refused with `SESSION_CHANGED`, an ending after the native side signed out on its own is `not-applicable`, and `dispose()` removes the listener.
- Not run: the iOS and Android TurboModules, the native Firebase SDKs and their restoration from the keychain and shared preferences, the order in which a device delivers native events, native provider sign-in, and a real Firebase project.

## License

MIT
