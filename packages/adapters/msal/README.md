# @priemskiyyy/anchor-msal

Microsoft Entra ID sessions for Anchor, over the MSAL.js `PublicClientApplication` your application created. The adapter answers the active account you chose with `setActiveAccount()` as a session of its environment, home account id and tenant, never the first account MSAL happens to cache, reads again whenever MSAL reports that the account may have changed, mints an access token for each token profile's scopes through `acquireTokenSilent` for exactly that account, and ends the session by clearing that account alone from MSAL's cache. `initialize()`, the login redirect and popup, `setActiveAccount()` and the Microsoft Entra logout page stay with `anchor.native`, which is your client.

## Installation

```sh
pnpm add @priemskiyyy/anchor @priemskiyyy/anchor-msal @azure/msal-browser
```

## Create an Anchor

```ts
import { Anchor } from "@priemskiyyy/anchor";
import { accessToken, msal } from "@priemskiyyy/anchor-msal";
import { PublicClientApplication } from "@azure/msal-browser";

const client = new PublicClientApplication({
  auth: { clientId, authority, redirectUri: location.origin },
  cache: { cacheLocation: "localStorage" },
});

const initialized = client
  .initialize()
  .then(() => client.handleRedirectPromise())
  .then((result) => {
    if (result === null) {
      return;
    }

    client.setActiveAccount(result.account);
  });

export const anchor = new Anchor({
  adapter: msal({
    sdk: client,
    initialized,
    tokens: {
      graph: accessToken({ scopes: ["User.Read"] }),
      api: accessToken({ scopes: ["api://my-api/read"] }),
    },
  }),
});

await anchor.start();
```

Anchor is `initializing` until `initialized` settles, then answers the active account. Pass the promise `initialize()` returned, or, as here, one that also handles the login redirect and sets the account it signed in, so the first read sees that account. After `loginPopup()`, call `setActiveAccount(result.account)` yourself. A login, `setActiveAccount()` and a token refresh reach Anchor through MSAL's events; nothing needs `anchor.sync()`.

## Options

| Option        | Type                              | Default                   | What it does                                                      |
| ------------- | --------------------------------- | ------------------------- | ----------------------------------------------------------------- |
| `sdk`         | `PublicClientApplication`         | required                  | The client you created, or the one a nested app factory returned. |
| `initialized` | `Promise<unknown>`                | none                      | The promise of your MSAL start-up; every read waits for it.       |
| `user`        | `(account: AccountInfo) => TUser` | a snapshot of the account | Maps the active account to the plain data a session carries.      |
| `tokens`      | `Record<string, MsalAccessToken>` | none                      | The token profiles, each `accessToken({ scopes })`.               |

## Capabilities

| Capability           | MSAL                                                                                                                                               |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Observation          | Invalidation, through `addEventCallback`: `msal:initializeEnd`, `msal:activeAccountChanged`, `msal:loginSuccess` and `msal:acquireTokenSuccess`.   |
| Token profiles       | `accessToken({ scopes })`, one per set of scopes.                                                                                                  |
| Forced refresh       | Yes: `acquireTokenSilent({ forceRefresh: true })`.                                                                                                 |
| End                  | Local: `clearCache({ account })`, that account only. Remote: unknown, because the Microsoft Entra session survives until the browser signs it out. |
| Navigation after end | No: MSAL.js 5 builds its logout page only while navigating to it.                                                                                  |
| Runtimes             | Browsers, including the instance you give `@azure/msal-react`'s `MsalProvider`.                                                                    |

## How a session is mapped

| Session               | From the active account (`getActiveAccount()`)                                                      |
| --------------------- | --------------------------------------------------------------------------------------------------- |
| `principal.authority` | `environment`, the cloud MSAL caches the account under, such as `login.windows.net`                 |
| `principal.subject`   | `homeAccountId`, the account's id in its home tenant, which MSAL keys its cache by                  |
| `principal.tenant`    | `tenantId`, the tenant this account profile is signed in to, or `null` outside Microsoft Entra ID   |
| context               | `idTokenClaims.sid`: another sign-in of the same account is a new session                           |
| `user`                | `{ homeAccountId, environment, tenantId, username, localAccountId, name }`, or your mapper's result |
| `guest`               | `false`                                                                                             |
| `impersonated`        | `false`                                                                                             |

The principal is MSAL's own key for the account, so it never depends on the ID token claims, which MSAL can lack for a tenant profile. The same user in their home tenant and as a guest in another tenant is two sessions, one per tenant. When the ID token carries no `sid`, the context is `null`.

## Tokens

`session.getToken(profile)` checks that the active account is still the session's environment, home account id, tenant and sid, then calls `acquireTokenSilent({ scopes, account, forceRefresh })` with that account, so the token is always the session's own, even if the active account changes while it is minted. MSAL answers from its cache, refreshes through the refresh token, or renews in a hidden iframe. The token's `kind` is `access-token` and its `scheme` is the `tokenType` MSAL answers, `Bearer`.

An `InteractionRequiredAuthError` rejects with `INTERACTION_REQUIRED` and MSAL's error as its `cause`: call `acquireTokenPopup()` or `acquireTokenRedirect()` yourself. Any other failure rejects with `TOKEN_FAILED` and MSAL's error as its `cause`. A token asked for an account MSAL no longer holds as its active one rejects with `SESSION_CHANGED` before MSAL is asked.

## Ending the session

`session.end()` acts only while the active account is still the session's. It calls `clearCache({ account })`, which removes that account, its tokens and, since it is active, the active account from MSAL's cache, without navigating, and answers `{ local: "completed", remote: "unknown", navigation: null }`. Every other account MSAL caches stays; `clearCache()` or `logoutRedirect()` without an account would clear them all.

MSAL.js 5 reads `onRedirectNavigate` from the client's configuration only, never from a logout request, so the adapter cannot hand back the Microsoft Entra logout page without taking over your configuration. To end the Microsoft Entra session as well, sign out through MSAL instead of `session.end()`; Anchor hears the account go through `msal:activeAccountChanged` before the page leaves:

<!-- snippet: fragment -->

```ts
await anchor.native.logoutRedirect({
  account: anchor.native.getActiveAccount(),
});
```

When MSAL holds another active account, or none, the adapter clears nothing and answers `not-applicable`.

## What Anchor does not normalize

`initialize()`, `handleRedirectPromise()`, login and token popups and redirects, choosing and setting the active account, the Microsoft Entra logout page, `ssoSilent()`, claims challenges, proof-of-possession tokens, the platform broker and nested app authentication stay with MSAL. Read them through `anchor.native`.

## Behavior

- The factory is cold: creating the adapter touches nothing on the client.
- A read waits for `initialized` and answers `getActiveAccount()`: no active account is `signed-out`, even while MSAL caches accounts, because only your application chooses which one is signed in.
- Without `initialized`, start Anchor after `initialize()` resolved. A read before it on a `localStorage` cache fails with MSAL's `uninitialized_public_client_application` error, so the first state is `unavailable`, never `signed-out`, until `msal:initializeEnd` reads again. An `initialized` that rejects makes the first state `unavailable`.
- `msal:initializeEnd`, `msal:activeAccountChanged`, `msal:loginSuccess` and `msal:acquireTokenSuccess` each ask Anchor to read. With a `localStorage` cache, MSAL broadcasts an active account change to your other tabs, so a sign-in or sign-out in one tab reaches the others.
- Outside a browser, as in a server render, MSAL registers no event callback, so the adapter observes nothing there and `anchor.sync()` reads.
- `dispose()` removes exactly the adapter's own event callback, never yours.
- An account without an environment or a home account id is outside the contract; the first state is then `unavailable`.

## Tests

Unit tests run over an in-process fake modelled on @azure/msal-browser 5.22.0, including the conformance suite. The contracts file typechecks the real `PublicClientApplication`, `IPublicClientApplication` and `AccountInfo` types. The real MSAL.js runs in jsdom against an in-process token endpoint: a client restored from an encrypted `localStorage` cache stays `initializing` until `initialized` settles, a read before `initialize()` fails with MSAL's own error and `msal:initializeEnd` reads again, an account cached by a code exchange is no session until it is made active, tokens come from MSAL's cache and refresh through the refresh token grant, an `interaction_required` refresh becomes `INTERACTION_REQUIRED`, ending clears only the session's account, and an active account set in a second client on the same `localStorage` reaches the first through MSAL's broadcast until `dispose()` removes the callback. The login redirect and popup, the hidden iframe renewal, the platform broker and a real Microsoft Entra tenant were not run.

## License

MIT
