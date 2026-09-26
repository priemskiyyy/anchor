# @priemskiyyy/anchor-auth0

Auth0 sessions for Anchor, over the auth0-spa-js client your application created. The adapter answers the ID token in the client's cache as a session of its issuer and subject, mints an access token for each profile's audience and scope through `getTokenSilently`, and ends the session by clearing the client and handing back Auth0's logout page. auth0-spa-js emits no events, so call `anchor.sync()` after a login. Logging in, handling the redirect callback and federated logout stay with `anchor.native`, which is your client.

## Installation

```sh
pnpm add @priemskiyyy/anchor @priemskiyyy/anchor-auth0 @auth0/auth0-spa-js
```

## Create an Anchor

```ts
import { Anchor } from "@priemskiyyy/anchor";
import { accessToken, auth0 } from "@priemskiyyy/anchor-auth0";
import { createAuth0Client } from "@auth0/auth0-spa-js";

const client = await createAuth0Client({
  domain,
  clientId,
  authorizationParams: { redirect_uri: location.origin },
});

export const anchor = new Anchor({
  adapter: auth0({
    sdk: client,
    tokens: {
      api: accessToken({
        audience: "https://api.example.com",
        scope: "read:projects",
      }),
    },
    returnTo: location.origin,
  }),
});

if (location.search.includes("code=")) {
  await anchor.native.handleRedirectCallback();
}

await anchor.start();
```

After `loginWithPopup()` or any other native call that changes the session, call `anchor.sync()`.

## Options

| Option     | Type                               | Default                          | What it does                                                                          |
| ---------- | ---------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------- |
| `sdk`      | `Auth0Client`                      | required                         | The client `createAuth0Client()` returned.                                            |
| `user`     | `(claims: IdToken) => TUser`       | a snapshot of the profile claims | Maps the ID token claims to the plain data a session carries.                         |
| `tokens`   | `Record<string, Auth0AccessToken>` | none                             | The token profiles, each `accessToken({ audience, scope })`.                          |
| `returnTo` | `string`                           | Auth0's default                  | Where Auth0's logout page sends the browser back to; one of your Allowed Logout URLs. |

## Capabilities

| Capability           | Auth0                                                                                          |
| -------------------- | ---------------------------------------------------------------------------------------------- |
| Observation          | None: auth0-spa-js emits no events. Call `anchor.sync()` after a login.                        |
| Token profiles       | `accessToken({ audience, scope })`, one per API.                                               |
| Forced refresh       | Yes: `cacheMode: "off"`.                                                                       |
| End                  | Local: the client's cache is cleared. Remote: pending until the browser opens the logout page. |
| Navigation after end | Yes: `result.navigation.url` is Auth0's `/v2/logout` page.                                     |
| Runtimes             | Browsers. `react-native-auth0` has its own adapter.                                            |

## How a session is mapped

| Session               | From the ID token                                                                  |
| --------------------- | ---------------------------------------------------------------------------------- |
| `principal.authority` | `iss`, your Auth0 domain's issuer                                                  |
| `principal.subject`   | `sub`, such as `auth0\|42` or `google-oauth2\|1234`                                |
| `principal.tenant`    | `null`                                                                             |
| context               | `org_id` and `sid`: another organization or a new login is a new session           |
| `user`                | `{ sub, name, nickname, picture, email, email_verified }`, or your mapper's result |
| `guest`               | `false`                                                                            |
| `impersonated`        | `true` when the token carries an `act` claim                                       |

## Tokens

`session.getToken(profile)` checks that the cached ID token still belongs to the session, then calls `getTokenSilently({ authorizationParams: { audience, scope }, cacheMode, detailedResponse: true })`. It checks the cached ID token again once the token arrives, because a token the silent iframe mints belongs to whoever Auth0's session cookie names now: a login in another tab meanwhile rejects with `SESSION_CHANGED`, never that user's token. The token's `kind` is `access-token` and its `scheme` is the `token_type` Auth0 answers, `Bearer` or `DPoP`. `login_required`, `consent_required`, `interaction_required`, `mfa_required` and `missing_refresh_token` reject with `INTERACTION_REQUIRED`: call `loginWithRedirect` or `loginWithPopup` yourself. Any other failure rejects with `TOKEN_FAILED` and the Auth0 error as its `cause`.

## Ending the session

`session.end()` calls `logout({ openUrl })` only while the cache still holds the session's ID token, and answers `{ local: "completed", remote: "unknown", navigation: { url } }`. The Auth0 session survives until the browser opens that page, so open it:

```ts
const result = await session.end();

if (result.navigation !== null) {
  location.assign(result.navigation.url);
}
```

When the cache holds another login, it logs nobody out and answers `not-applicable`. Federated logout (`logoutParams.federated`) stays with `anchor.native.logout()`.

## What Anchor does not normalize

Logging in, the redirect callback, popups, organization invitations, MFA challenges, DPoP proofs and nonces, and refresh-token rotation stay with auth0-spa-js. Read them through `anchor.native`.

## Behavior

- The factory is cold: creating the adapter touches nothing on the client.
- A read answers from `getIdTokenClaims()`: no cached ID token is `signed-out`.
- An ID token without `iss` or `sub` is outside the contract; the first state is then `unavailable`.
- The adapter installs no listener, so `dispose()` has nothing to remove.

## Tests

Unit tests run over an in-process fake modelled on auth0-spa-js 2.27.0, including the conformance suite. The contracts file typechecks the real `Auth0Client` and `IdToken` types. The real client runs in jsdom with an empty memory cache. Login against an Auth0 tenant was not run.

## License

MIT
