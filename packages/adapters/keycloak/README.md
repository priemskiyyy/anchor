# @priemskiyyy/anchor-keycloak

Keycloak sessions for Anchor, over the keycloak-js instance your application created. The adapter answers the access token keycloak-js holds as a session of its realm's issuer and subject, chains the callbacks you assigned so it hears every login, refresh and logout without replacing them, mints the access token through `updateToken()` for each token profile, and ends the session by clearing keycloak-js's tokens and handing back Keycloak's logout page. It never calls `logout()`, which navigates by itself. `init()`, `login()`, `register()` and every other flow stay with `anchor.native`, which is your instance.

Version 0.1.0 is an initial preview. APIs may change before 1.0. See the [verification limits](https://github.com/priemskiyyy/anchor/blob/main/docs/verification.md) before adopting an adapter.

## Installation

```sh
pnpm add @priemskiyyy/anchor @priemskiyyy/anchor-keycloak keycloak-js
```

## Create an Anchor

```ts
import { Anchor } from "@priemskiyyy/anchor";
import { accessToken, keycloak } from "@priemskiyyy/anchor-keycloak";
import Keycloak from "keycloak-js";

const instance = new Keycloak({
  url: "https://sso.example.com",
  realm: "acme",
  clientId: "web",
});

instance.onAuthLogout = () => showSignedOutBanner();

export const anchor = new Anchor({
  adapter: keycloak({ sdk: instance, tokens: { api: accessToken() } }),
});

const started = anchor.start();

await instance.init({
  onLoad: "check-sso",
  silentCheckSsoRedirectUri: `${location.origin}/silent-check-sso.html`,
});
await started;
```

Anchor is `initializing` until `init()` finishes, then answers what keycloak-js found. When `init()` may already be running as Anchor starts, as in an application that starts both at once, pass the promise it returned:

<!-- snippet: fragment -->

```ts
const initialized = instance.init({ onLoad: "check-sso" });

export const anchor = new Anchor({
  adapter: keycloak({
    sdk: instance,
    initialized,
    tokens: { api: accessToken() },
  }),
});

await anchor.start();
```

Every read then waits for it, and an `init()` that fails makes the first state `unavailable`, never `signed-out`.

Assign your own callbacks before `anchor.start()`: the adapter chains whatever each one holds when it opens, and a callback you assign later replaces Anchor's until `dispose()`.

## Options

| Option        | Type                                     | Default                          | What it does                                                                               |
| ------------- | ---------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------ |
| `sdk`         | `Keycloak`                               | required                         | The instance `new Keycloak(config)` returned, before or after `init()`.                    |
| `initialized` | `Promise<boolean>`                       | none                             | The promise `init()` returned; every read waits for it. Required once `init()` was called. |
| `user`        | `(claims: KeycloakTokenParsed) => TUser` | a snapshot of the profile claims | Maps the access token claims to the plain data a session carries.                          |
| `tokens`      | `Record<string, KeycloakAccessToken>`    | none                             | The token profiles, each `accessToken()`.                                                  |

## Capabilities

| Capability           | Keycloak                                                                                                                             |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Observation          | Push, through `onAuthSuccess`, `onAuthRefreshSuccess` and `onAuthLogout`, chained ahead of yours; `onReady` releases the first read. |
| Token profiles       | `accessToken()`: the Keycloak access token.                                                                                          |
| Forced refresh       | Yes: `updateToken(-1)`. Without a refresh token, `UNSUPPORTED`.                                                                      |
| End                  | Local: `clearToken()`. Remote: pending until the browser opens Keycloak's logout page.                                               |
| Navigation after end | Yes: `createLogoutUrl({ logoutMethod: "GET" })`, or `null` when the provider publishes no end-session endpoint.                      |
| Runtimes             | Browsers, and Cordova through keycloak-js's own adapters.                                                                            |

## How a session is mapped

| Session               | From the access token keycloak-js holds (`tokenParsed`)                                                      |
| --------------------- | ------------------------------------------------------------------------------------------------------------ |
| `principal.authority` | `iss`, the realm's issuer                                                                                    |
| `principal.subject`   | `sub`, the user's id in the realm                                                                            |
| `principal.tenant`    | `null`                                                                                                       |
| context               | `organization` and `sid`: another organization or another Keycloak session is a new session                  |
| `user`                | `{ sub, name, preferred_username, given_name, family_name, email, email_verified }`, or your mapper's result |
| `guest`               | `false`                                                                                                      |
| `impersonated`        | `false`                                                                                                      |

Keycloak puts the user's session as `sid` in the access token and, with the `organization` client scope of Keycloak 26, the user's organizations as `organization`. Two realms are two issuers, so two authorities. A lightweight access token that leaves out `sub` is outside the contract.

## Tokens

`session.getToken(profile)` checks that keycloak-js still holds the session's issuer, subject and context, then calls `updateToken(30)`: a token with less than 30 seconds left is refreshed first, so the one handed over outlives the request that carries it. A forced token calls `updateToken(-1)`. The token's `kind` is `access-token` and its `scheme` is `Bearer`; the token is checked against the session again after the refresh.

Without a refresh token, as with the implicit flow or a client that issues none, keycloak-js cannot refresh: the held token is answered as it is, and a forced one rejects with `UNSUPPORTED`. A refresh Keycloak refuses with a 400 means its session ended: keycloak-js clears its tokens and calls `onAuthLogout`, so the session becomes `signed-out` and the token rejects with `SESSION_CHANGED`. The adapter answers that refusal as `INTERACTION_REQUIRED`, which is what a caller sees when you replaced `onAuthLogout` after the start. Any other failure rejects with `TOKEN_FAILED` and the keycloak-js error as its `cause`.

## Ending the session

`session.end()` acts only while keycloak-js still holds the session's tokens. It takes `createLogoutUrl({ logoutMethod: "GET" })` first, because the page carries the ID token as `id_token_hint`, then calls `clearToken()`, and answers `{ local: "completed", remote: "unknown", navigation: { url } }`. It asks for the GET form of the page whatever `logoutMethod` you initialized with, because `navigation` is a page to open. The Keycloak session survives until the browser opens it:

```ts
const result = await session.end();

if (result.navigation !== null) {
  location.assign(result.navigation.url);
}
```

The page returns to the `redirectUri` you gave `init()`, or to the current page. keycloak-js throws instead of building the page for a generic OpenID Connect provider that publishes no end-session endpoint; the tokens are still cleared, and the answer is `{ local: "completed", remote: "unknown", navigation: null }`. When keycloak-js holds another session, the adapter clears nothing and answers `not-applicable`. With `onLoad: "login-required"`, keycloak-js starts a new login as soon as its tokens are cleared.

## What Anchor does not normalize

`init()` and its options, the login and registration redirects, the check-login iframe, the silent check-SSO page, account management, `loadUserProfile()` and `loadUserInfo()`, realm and client roles (`hasRealmRole`, `hasResourceRole`), required actions (`onActionUpdate`) and expiry notices (`onTokenExpired`) stay with keycloak-js. Read them through `anchor.native`.

## Behavior

- The factory is cold: creating the adapter touches nothing on the instance.
- keycloak-js sets `didInitialize` as `init()` begins and reports its end only through `onReady` and the promise `init()` returned. Started before `init()` is called, a read waits for `onReady`, so Anchor is `initializing`, never `signed-out`; if `init()` never finishes, the read times out and the first state is `unavailable`.
- Once `init()` was called, pass the promise it returned as `initialized`, and every read waits for it. Without it, `start()` rejects with `START_FAILED` and an `INVALID_CONFIGURATION` cause, because a read while `init()` runs would answer `signed-out` before keycloak-js found the login.
- After `init()`, no token is `signed-out`: keycloak-js holds no session.
- The adapter chains `onReady`, `onAuthSuccess`, `onAuthRefreshSuccess` and `onAuthLogout`: its handler runs first, then yours, with the same arguments and the instance as `this`. `dispose()` restores exactly what each held when Anchor opened, and leaves alone one you replaced since.
- keycloak-js calls these callbacks inside `init()` and its token flows, so a `user` mapper that throws there asks Anchor for a read instead of failing them; the failed read is a diagnostic.
- An access token without `iss` or `sub` is outside the contract; the first state is then `unavailable`.

## Tests

Unit tests run over an in-process fake modelled on keycloak-js 26.2.4, including the conformance suite. The contracts file typechecks the real `Keycloak` and `KeycloakTokenParsed` types. The real keycloak-js runs in jsdom against an in-process token endpoint: Anchor started before `init()` stays `initializing` until `init()` finishes, tokens refresh through `updateToken`, a 400 from the token endpoint becomes `INTERACTION_REQUIRED` after keycloak-js cleared its tokens, ending builds the real logout page without calling `logout()`, and `dispose()` restores the application's callbacks. The login redirect, the check-login iframe, the silent check-SSO page and a real Keycloak server were not run.

## License

MIT
