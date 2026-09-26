---
description: "Okta sessions for Anchor over okta-auth-js: the auth state manager pushes, a read follows Okta's own updateAuthState(), accessToken() mints from the token manager, and ending revokes the tokens and hands back Okta's sign-out page."
---

# Okta

`@priemskiyyy/anchor-okta` reads the okta-auth-js `OktaAuth` instance your application created. It answers the auth state okta-auth-js computes as a session of its ID token's issuer and subject, hears every change through the auth state manager, mints the token manager's access token for each token profile, and ends the session by revoking its tokens, clearing the token manager and handing back Okta's sign-out page. It never calls `signOut()`, which navigates by itself. Signing in, the login redirect and `oktaAuth.start()` stay with `anchor.native`, which is your instance.

## Install

```sh
pnpm add @priemskiyyy/anchor @priemskiyyy/anchor-okta @okta/okta-auth-js
```

The adapter supports okta-auth-js 8.

## Create an Anchor

```ts
import { Anchor } from "@priemskiyyy/anchor";
import { accessToken, okta } from "@priemskiyyy/anchor-okta";
import { OktaAuth } from "@okta/okta-auth-js";

const oktaAuth = new OktaAuth({
  issuer: "https://acme.okta.com/oauth2/default",
  clientId: "0oa_web",
  redirectUri: `${location.origin}/login/callback`,
  postLogoutRedirectUri: location.origin,
  scopes: ["openid", "profile", "email", "offline_access"],
});

export const anchor = new Anchor({
  adapter: okta({ sdk: oktaAuth, tokens: { api: accessToken() } }),
});

if (oktaAuth.isLoginRedirect()) {
  await oktaAuth.handleLoginRedirect();
}

await oktaAuth.start();
await anchor.start();
```

The tokens `handleLoginRedirect()`, `setTokens()` or a renewal store reach Anchor through the auth state manager; nothing needs `anchor.sync()`.

## Options

| Option   | Type                              | Default                          | What it does                                                  |
| -------- | --------------------------------- | -------------------------------- | ------------------------------------------------------------- |
| `sdk`    | `OktaAuth`                        | required                         | The instance `new OktaAuth(config)` returned.                 |
| `user`   | `(claims: UserClaims) => TUser`   | a snapshot of the profile claims | Maps the ID token claims to the plain data a session carries. |
| `tokens` | `Record<string, OktaAccessToken>` | none                             | The token profiles, each `accessToken()`.                     |

## Capabilities

| Capability           | Okta                                                                                                                                              |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Observation          | Push, through `authStateManager.subscribe`: every auth state okta-auth-js emits.                                                                  |
| Token profiles       | `accessToken()`: the token manager's access token.                                                                                                |
| Forced refresh       | Yes: `tokenManager.renew()`.                                                                                                                      |
| End                  | Local: `tokenManager.clear()`, after `revokeRefreshToken()` and `revokeAccessToken()`. Remote: pending until the browser opens the sign-out page. |
| Navigation after end | Yes: the page `getSignOutRedirectUrl()` builds, with the ID token as `id_token_hint` and your `postLogoutRedirectUri`.                            |
| Runtimes             | Browsers, and Node through okta-auth-js's Node build.                                                                                             |

## How a session is mapped

| Session               | From the ID token of the auth state (`authState.idToken.claims`)                                             |
| --------------------- | ------------------------------------------------------------------------------------------------------------ |
| `principal.authority` | `iss`, your authorization server's issuer                                                                    |
| `principal.subject`   | `sub`, the Okta user id                                                                                      |
| `principal.tenant`    | `null`                                                                                                       |
| context               | `sid`: another Okta session is a new session                                                                 |
| `user`                | `{ sub, name, preferred_username, given_name, family_name, email, email_verified }`, or your mapper's result |
| `guest`               | `false`                                                                                                      |
| `impersonated`        | `false`                                                                                                      |

Anchor follows okta-auth-js's own `isAuthenticated`, which needs both an access token and an ID token and passes through your `transformAuthState`. Two authorization servers are two issuers, so two authorities.

## Tokens

`session.getToken(profile)` checks that the token manager still holds the session's issuer, subject and Okta session, then answers the stored access token with its `tokenType` (`Bearer` or `DPoP`) as the scheme. It renews through `tokenManager.renew()` first when the token has expired, which okta-auth-js counts 30 seconds early, or when the caller asks for `forceRefresh`, and checks the renewed tokens against the session again. A renewal that leaves no access token rejects with `TOKEN_FAILED`.

okta-auth-js removes the access token when a renewal fails, for any reason, and emits the unauthenticated state before it rejects. When Okta refused the refresh token as invalid, okta-auth-js removes that too, so the session is signed out first and the token rejects with `SESSION_CHANGED`: call `signInWithRedirect()` yourself. A renewal that failed on the way, offline for one, keeps the refresh token, so the session stays signed in and only the token rejects. The adapter's own answers, `INTERACTION_REQUIRED` for `login_required`, `interaction_required`, `account_selection_required`, `consent_required` and `invalid_grant`, and the Okta error for anything else, reach only a caller whose session is still current.

## Ending the session

`session.end()` acts only while the token manager holds the session's ID token. It revokes the refresh token, when there is one, then the access token, handing `revokeRefreshToken()` and `revokeAccessToken()` the tokens themselves; then it clears the token manager and answers `{ local: "completed", remote: "unknown", navigation: { url } }` with the page `getSignOutRedirectUrl()` builds from the ID token. Revoking ends the tokens at Okta, but Okta's session survives until the browser opens that page:

```ts
const result = await session.end();

if (result.navigation !== null) {
  location.assign(result.navigation.url);
}
```

A revocation that fails rejects with `END_FAILED` and clears nothing, as okta-auth-js's own `signOut()` would. When okta-auth-js takes on another session while the tokens are revoked, as another tab can through storage sync, nothing is cleared and the answer is `{ local: "not-applicable", remote: "unknown", navigation: null }`. When the token manager holds another session from the start, nothing is revoked and the answer is `not-applicable`. okta-auth-js 8.0.1 has `getSignOutRedirectUrl()` at runtime but leaves it out of its type declarations, so the adapter calls it when it is there and answers `navigation: null` when it is not. The page returns to your `postLogoutRedirectUri`. DPoP key pairs stay with okta-auth-js: call `anchor.native.clearDPoPStorage()` after ending.

## Behavior

- The factory is cold: creating the adapter touches nothing on `OktaAuth`.
- A read asks `authStateManager.updateAuthState()` for the auth state, as `start()` does, and answers it: not authenticated is `signed-out` once no refresh token is left, and a read that fails while okta-auth-js still holds one, because it could not renew the others. The update may renew an expired token first, as okta-auth-js does whenever it computes the state, and every subscriber, yours included, hears the state it computes.
- The auth state okta-auth-js emits is pushed as it is. A state that carries a `transformAuthState` error is no evidence either way: pushed, it asks for a read; read, it fails the read, so the first state is then `unavailable`.
- okta-auth-js emits inside its auth state update and turns a subscriber's throw into an error state for every subscriber, so a `user` mapper that throws there asks Anchor for a read instead; the failed read is a diagnostic.
- An authenticated state without an ID token, from a flow without the `openid` scope or a `transformAuthState` that authenticates without one, cannot be named and fails the read; an ID token without `iss` or `sub` is outside the contract. Either way the first state is then `unavailable`.
- `dispose()` unsubscribes exactly its own handler, never yours.

## What Anchor does not normalize

Sign-in redirects and popups, `handleLoginRedirect()`, the Identity Engine flows, `start()` and `stop()` with the token auto-renew and storage sync services, `transformAuthState`, the user info endpoint (`getUser()`), DPoP proofs and key pairs, and the Okta session API (`closeSession()`, `session.exists()`) stay with okta-auth-js. Read them through `anchor.native`.

The adapter runs against a fake modelled on okta-auth-js 8.0.1 and against okta-auth-js itself in Node, over in-process Okta endpoints; see the [verification matrix](../verification.md). The [package README](https://github.com/priemskiyyy/anchor/tree/main/packages/adapters/okta#readme) is the reference.
