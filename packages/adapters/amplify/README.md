# @priemskiyyy/anchor-amplify

Amazon Cognito sessions for Anchor, over the Amplify v6 Auth functions and Hub of your configured application. Amplify v6 exports functions over one configured singleton instead of an instance, so the adapter takes the functions of `aws-amplify/auth` and the `Hub` of `aws-amplify/utils`. It answers the user `getCurrentUser()` holds as a session of the ID token's user pool and subject, reads again on every Hub auth event and takes Amplify's `signedOut` as its own word, mints the session's access or ID token for each token profile through `fetchAuthSession()`, and ends the session by signing this device out with `signOut({ global: false })`. `Amplify.configure()`, signing in, the hosted UI and every other flow stay with `anchor.native`.

Version 0.1.0 is an initial preview. APIs may change before 1.0. See the [verification limits](https://github.com/priemskiyyy/anchor/blob/main/docs/verification.md) before adopting an adapter.

## Installation

```sh
pnpm add @priemskiyyy/anchor @priemskiyyy/anchor-amplify aws-amplify
```

## Create an Anchor

```ts
import { Anchor } from "@priemskiyyy/anchor";
import { accessToken, amplify, idToken } from "@priemskiyyy/anchor-amplify";
import { Amplify } from "aws-amplify";
import * as auth from "aws-amplify/auth";
import { Hub } from "aws-amplify/utils";

import outputs from "../amplify_outputs.json";

Amplify.configure(outputs);

export const anchor = new Anchor({
  adapter: amplify({
    sdk: { auth, hub: Hub },
    tokens: { api: accessToken(), identity: idToken() },
  }),
});

await anchor.start();
```

Configure Amplify before `anchor.start()`: an Amplify without a user pool is `unavailable`, never `signed-out`. Sign-ins, token refreshes and sign-outs reach Anchor through the Hub; nothing needs `anchor.sync()`.

`sdk.auth` takes the `aws-amplify/auth` namespace or only the three functions the adapter calls, which lets your bundler leave out the rest of Auth:

<!-- snippet: fragment -->

```ts
import { fetchAuthSession, getCurrentUser, signOut } from "aws-amplify/auth";

const adapter = amplify({
  sdk: { auth: { fetchAuthSession, getCurrentUser, signOut }, hub: Hub },
});
```

## React Native and Expo

Amplify v6 runs these same functions on React Native, so this adapter serves it. Install `@aws-amplify/react-native`, the optional peer `@aws-amplify/auth` names, with the native modules it loads, such as `@react-native-async-storage/async-storage` for the token store and `react-native-get-random-values`, as Amplify's React Native guide shows, and create the Anchor exactly as above.

- Tokens persist in AsyncStorage, and the first read waits for Amplify to load them, so a restart is `initializing`, never `signed-out`, until `getCurrentUser()` answers.
- Amplify dispatches `signedOut` without waiting for AsyncStorage to finish removing the tokens, so the adapter pushes `signed-out` on that event instead of reading.
- With the hosted UI, `signOut()` opens Cognito's logout page in the in-app browser and clears the tokens only once the visit succeeds. When the user closes the page, `session.end()` answers `local: "unknown"` and the session stays.
- Amplify refreshes tokens on demand, not on a schedule; to read again when the app returns to the foreground, add `appState()` from `@priemskiyyy/anchor-react-native`.

## Options

| Option   | Type                                                   | Default                | What it does                                                             |
| -------- | ------------------------------------------------------ | ---------------------- | ------------------------------------------------------------------------ |
| `sdk`    | `{ auth, hub }`                                        | required               | The `aws-amplify/auth` functions and the `Hub` of `aws-amplify/utils`.   |
| `user`   | `(user: AuthUser) => TUser`                            | a snapshot of the user | Maps the user `getCurrentUser()` answers to the plain data of a session. |
| `tokens` | `Record<string, AmplifyAccessToken \| AmplifyIdToken>` | none                   | The token profiles, each `accessToken()` or `idToken()`.                 |

## Capabilities

| Capability           | Amplify                                                                                                                                              |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Observation          | Through `Hub.listen("auth")`: `signedOut` is pushed as `signed-out`; `signedIn`, `tokenRefresh`, `tokenRefresh_failure` and the rest ask for a read. |
| Token profiles       | `accessToken()` and `idToken()`: the session's Cognito tokens.                                                                                       |
| Forced refresh       | Yes: `fetchAuthSession({ forceRefresh: true })`.                                                                                                     |
| End                  | Local: `signOut({ global: false })`, this device only. Remote: unknown, because Amplify goes on when revoking the refresh token fails.               |
| Navigation after end | No: with the hosted UI, Amplify opens Cognito's logout page itself.                                                                                  |
| Runtimes             | Browsers, React Native and Expo with `@aws-amplify/react-native`, Node.                                                                              |

## How a session is mapped

| Session               | From the user `getCurrentUser()` holds and the ID token of `fetchAuthSession()`                             |
| --------------------- | ----------------------------------------------------------------------------------------------------------- |
| `principal.authority` | The ID token's `iss`, the user pool, such as `https://cognito-idp.us-east-1.amazonaws.com/us-east-1_AbCdEf` |
| `principal.subject`   | The ID token's `sub`, the user's id in the pool                                                             |
| `principal.tenant`    | `null`                                                                                                      |
| context               | The ID token's `origin_jti`: another sign-in of the same user is a new session                              |
| `user`                | `{ username, userId, signInDetails: { loginId, authFlowType } }`, or your mapper's result                   |
| `guest`               | `false`                                                                                                     |
| `impersonated`        | `false`                                                                                                     |

`origin_jti` names the refresh token a token came from: it stays the same across refreshes and changes with every sign-in. An app client without token revocation puts no `origin_jti` in its tokens, and the context is then `null`. Cognito groups are roles rather than a security context, so a group change keeps the session and its key. An identity pool's guest credentials are no session: without a signed-in user the state is `signed-out`.

## Tokens

`session.getToken(profile)` calls `fetchAuthSession({ forceRefresh })` and checks that its ID token is still the session's user pool, subject and `origin_jti` before it answers the token from that same call, so a token is never another sign-in's. Amplify refreshes an expired token, or any token when forced, through the refresh token. `accessToken()` answers the access token with the scheme `Bearer`, the token type Cognito answers; `idToken()` answers the ID token with no scheme, because Cognito names none for it.

A refresh Cognito refuses with `NotAuthorizedException` makes Amplify clear its tokens and answer none, so the token rejects with `SESSION_CHANGED` and the session is signed out. Amplify also clears its tokens before it throws `TokenRevokedException`, `UserNotFoundException`, `PasswordResetRequiredException`, `UserNotConfirmedException` or `RefreshTokenReuseException`, and dispatches `tokenRefresh_failure`: the adapter answers those as `INTERACTION_REQUIRED`, which a caller sees unless the read that event asks for signed the session out first. Any other failure rejects with `TOKEN_FAILED` and Amplify's error as its `cause`, and Amplify keeps the tokens. When the identity pool is configured, `fetchAuthSession()` also fetches its AWS credentials, and a failure there fails the token.

## Ending the session

`session.end()` checks through `fetchAuthSession()` that Amplify still holds the session's user pool, subject and `origin_jti`, then calls `signOut({ global: false })`, never a global sign-out. Amplify revokes the refresh token, going on when that fails, clears the tokens on this device and dispatches `signedOut`; the adapter answers `{ local: "completed", remote: "unknown", navigation: null }` once it heard that event during the call. A `signOut()` that returns without dispatching it, as on React Native when the user closes the hosted UI's logout page, answers `{ local: "unknown", remote: "unknown", navigation: null }`, and Anchor reads to reconcile.

On the web, after a hosted UI sign-in, `signOut()` clears the tokens and then navigates the page to Cognito's logout endpoint itself, so the page leaves before `end()` resolves. Amplify's sign-out takes no user, so a sign-in that lands between the check and the sign-out is signed out too. When Amplify holds another user, or none, the adapter signs nobody out and answers `not-applicable`. A sign-out that throws rejects with `END_FAILED` and Amplify's error as its `cause`. To sign the user out of every device, call `anchor.native.auth.signOut({ global: true })` yourself.

## What Anchor does not normalize

`Amplify.configure()`, sign-up and sign-in with every challenge, MFA and passkeys, the hosted UI and `signInWithRedirect()`, user attributes, devices, identity pool credentials and guest access, and global sign-out stay with Amplify. Read them through `anchor.native`.

## Behavior

- The factory is cold: creating the adapter touches nothing on Amplify.
- A read asks `getCurrentUser()`: its `UserUnAuthenticatedException` is Amplify's word that no user is signed in, so `signed-out`. Only with a user does it call `fetchAuthSession()` for the ID token, which also fetches the identity pool's AWS credentials when one is configured, so a failure there fails the read. A user that changes between the two calls fails that read instead of mixing two users; the sign-in's own event reads again.
- `fetchAuthSession()` answers no tokens as readily for an Amplify without a user pool as for no user, so the adapter never takes it as evidence; an Amplify without a user pool fails the read with `AuthUserPoolException` and the first state is `unavailable`.
- A user whose tokens carry no ID token, from a hosted UI flow without the `openid` scope, cannot be named and fails the read; an ID token without `iss` or `sub` is outside the contract. Either way the first state is then `unavailable`.
- Every Hub auth event but `signedOut` asks for a read, and `signedOut` is pushed as `signed-out`.
- `dispose()` stops exactly the adapter's own Hub listener, never yours.

## Tests

Unit tests run over an in-process fake modelled on aws-amplify 6.20.0, including the conformance suite. The contracts file typechecks the real `aws-amplify/auth` namespace, its three functions on their own, the real `Hub` and `AuthUser`. The real Amplify runs in Node against in-process Cognito endpoints: no user is `signed-out` on `getCurrentUser()`'s word, a password sign-in reaches the session through the Hub, both token profiles come from `fetchAuthSession()`, a forced token refreshes through `GetTokensFromRefreshToken` and keeps the key, a `NotAuthorizedException` refresh clears the tokens and signs the session out, ending revokes the refresh token through `RevokeToken` and completes locally on `signedOut`, `dispose()` stops the Hub listener, and an Amplify without a user pool is `unavailable`. The hosted UI, SRP and custom challenges, identity pool credentials, React Native with `@aws-amplify/react-native` and a real user pool were not run; the React Native sign-out on a closed logout page is proved only against the fake.

## License

MIT
