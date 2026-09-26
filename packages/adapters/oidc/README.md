# @priemskiyyy/anchor-oidc

OpenID Connect sessions for Anchor, over the oidc-client-ts `UserManager` your application configured, for Okta, Keycloak, Zitadel, Authentik, Cognito's hosted UI, Entra or any other OpenID Connect provider. The adapter answers the stored user as a session of its ID token's issuer and subject, hears every sign-in, renewal and removal through the `UserManager`'s events, mints the user's access token for each token profile, and ends the session by removing the user and handing back the provider's end-session page. Signing in, handling the callback and every redirect stay with `anchor.native`, which is your `UserManager`.

## Installation

```sh
pnpm add @priemskiyyy/anchor @priemskiyyy/anchor-oidc oidc-client-ts
```

## Create an Anchor

```ts
import { Anchor } from "@priemskiyyy/anchor";
import { accessToken, oidc } from "@priemskiyyy/anchor-oidc";
import { UserManager } from "oidc-client-ts";

const userManager = new UserManager({
  authority: "https://id.example.com/realms/acme",
  client_id: "web",
  redirect_uri: `${location.origin}/callback`,
  post_logout_redirect_uri: location.origin,
  scope: "openid profile email offline_access",
});

export const anchor = new Anchor({
  adapter: oidc({ sdk: userManager, tokens: { api: accessToken() } }),
});

if (location.pathname === "/callback") {
  await anchor.native.signinCallback();
}

await anchor.start();
```

`signinCallback()`, `signinPopup()` and `signinSilent()` store the user and raise `userLoaded`, which Anchor hears; nothing needs `anchor.sync()`.

## Options

| Option   | Type                                | Default                          | What it does                                                                    |
| -------- | ----------------------------------- | -------------------------------- | ------------------------------------------------------------------------------- |
| `sdk`    | `UserManager`                       | required                         | The `UserManager` your application configured.                                  |
| `user`   | `(profile: IdTokenClaims) => TUser` | a snapshot of the profile claims | Maps the ID token claims of `user.profile` to the plain data a session carries. |
| `tokens` | `Record<string, OidcAccessToken>`   | none                             | The token profiles, each `accessToken()`.                                       |

## Capabilities

| Capability           | OpenID Connect                                                                                                                                    |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Observation          | Push: `userLoaded` and `userUnloaded` report every sign-in, renewal and removal; `userSignedOut`, from the session monitor, asks for a read.      |
| Token profiles       | `accessToken()`: the user's access token.                                                                                                         |
| Forced refresh       | Yes: `signinSilent()`, through the refresh token or the silent iframe.                                                                            |
| End                  | Local: `removeUser()`. Remote: pending until the browser opens the provider's end-session page.                                                   |
| Navigation after end | Yes: the provider's `end_session_endpoint` with the parameters `signoutRedirect()` sends, or `null` when the provider publishes no such endpoint. |
| Runtimes             | Browsers.                                                                                                                                         |

## How a session is mapped

| Session               | From the stored user's ID token claims                                                                                      |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `principal.authority` | `profile.iss`, your provider's issuer                                                                                       |
| `principal.subject`   | `profile.sub`                                                                                                               |
| `principal.tenant`    | `null`                                                                                                                      |
| context               | `org_id`, `organization`, `sid` and `act`: another organization, another provider session or another actor is a new session |
| `user`                | `{ sub, name, given_name, family_name, preferred_username, email, email_verified, picture }`, or your mapper's result       |
| `guest`               | `false`                                                                                                                     |
| `impersonated`        | `true` when the ID token carries an `act` claim                                                                             |

OpenID Connect has no standard organization claim: the adapter reads `org_id`, as Auth0 and others name it, and `organization`, as Keycloak names it. A provider that names it otherwise adds nothing to the context, and its `sid` still tells two logins apart. A multi-tenant provider such as Entra puts the tenant in the issuer, so two tenants are two authorities.

## Tokens

`session.getToken(profile)` reads `getUser()` and checks that the stored user is still the session's issuer, subject and context. It answers the stored `access_token` with its `token_type` (`Bearer` or `DPoP`) as the scheme, and calls `signinSilent()` first when the token has expired or the caller asks for `forceRefresh`. The renewed user must still be the session's, or the token rejects with `SESSION_CHANGED`. `login_required`, `interaction_required`, `account_selection_required`, `consent_required` and `invalid_grant`, a refresh token the provider no longer accepts, reject with `INTERACTION_REQUIRED`: call `signinRedirect()` or `signinPopup()` yourself. Any other failure, such as a silent iframe that timed out, rejects with `TOKEN_FAILED` and the oidc-client-ts error as its `cause`.

## Ending the session

`session.end()` calls `removeUser()` only while the stored user is still the session's, and answers `{ local: "completed", remote: "unknown", navigation: { url } }`. The page is the provider's `end_session_endpoint` with what `signoutRedirect()` sends: the ID token as `id_token_hint`, your `post_logout_redirect_uri` (with `client_id` when there is no ID token) and your `extraQueryParams`. It carries no `state`, as `signoutRedirect()` sends none by default, so `signoutCallback()` on the return page finds nothing missing. The provider's session survives until the browser opens that page, so open it:

```ts
const result = await session.end();

if (result.navigation !== null) {
  location.assign(result.navigation.url);
}
```

A provider that publishes no `end_session_endpoint` answers `{ local: "completed", remote: "not-applicable", navigation: null }`; metadata that cannot be read once the user was removed leaves `remote` `unknown` and `navigation` `null`. When the `UserManager` holds another user, the adapter removes nobody and answers `not-applicable`. `revokeTokensOnSignout` applies to `signoutRedirect()` only; to revoke, call `anchor.native.revokeTokens()` before `session.end()`.

## What Anchor does not normalize

Sign-in redirects and popups and their callbacks, silent renewal scheduling (`automaticSilentRenew`), the session monitor and its check-session iframe, token revocation, DPoP proofs, the user info endpoint and claim merging stay with oidc-client-ts. Read them through `anchor.native`.

## Behavior

- The factory is cold: creating the adapter touches nothing on the `UserManager`.
- A read answers from `getUser()`: no stored user is `signed-out`. Reading never raises `userLoaded`.
- `userLoaded` and `userUnloaded` push the new state, the renewal `signinSilent()` stores included. `userSignedOut` asks for a read instead, because the `UserManager` keeps the user until you remove it, and the session monitor also raises it when it merely fails to reach the provider.
- oidc-client-ts awaits its event callbacks and fails its own operation when one throws, so a `user` mapper that throws while the SDK signs someone in asks Anchor for a read instead: the sign-in succeeds, and the failed read is a diagnostic.
- A profile without `iss` or `sub`, from an OAuth flow without the `openid` scope, is outside the contract; the first state is then `unavailable`.
- `dispose()` removes exactly the three callbacks the adapter added, through the functions their `add*` calls answered.

## Tests

Unit tests run over an in-process fake modelled on oidc-client-ts 3.5.0, including the conformance suite. The contracts file typechecks the real `UserManager` and `IdTokenClaims` types. The real `UserManager` runs in Node against an in-process token endpoint: a password grant signs a user in through `userLoaded`, a forced token renews through the refresh token grant, `invalid_grant` becomes `INTERACTION_REQUIRED`, the end-session page equals the one its own `signoutRedirect()` opens, and its events stop reaching the adapter once `dispose()` removed its callbacks. Redirect and popup sign-in, the silent iframe, the session monitor and a real provider were not run.

## License

MIT
