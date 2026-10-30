# @priemskiyyy/anchor-workos

WorkOS AuthKit sessions for Anchor, over the AuthKit client `createClient()` returned. The adapter answers the user AuthKit holds as a session of its id, in the organization and with the impersonator its latest refresh reported, hears every sign-in, refresh, organization switch and refresh failure through the callbacks you create the client with, mints the access token for each token profile, and ends the session with `signOut({ navigate: false })`, which never leaves the page. Signing in, the redirect callback, `switchToOrganization()` and every other flow stay with `anchor.native`, which is your client.

Version 0.1.0 is an initial preview. APIs may change before 1.0. See the [verification limits](https://github.com/priemskiyyy/anchor/blob/main/docs/verification.md) before adopting an adapter.

## Installation

```sh
pnpm add @priemskiyyy/anchor @priemskiyyy/anchor-workos @workos-inc/authkit-js
```

## Create an Anchor

AuthKit takes its callbacks only when `createClient()` creates the client, and hands a session's organization and impersonator only to `onRefresh`. So create the relay first, give its two handlers to `createClient()`, and give the same relay to the adapter:

```ts
import { Anchor } from "@priemskiyyy/anchor";
import {
  accessToken,
  workos,
  workosRefreshes,
} from "@priemskiyyy/anchor-workos";
import { createClient } from "@workos-inc/authkit-js";

const refreshes = workosRefreshes();

const client = await createClient("client_01H...", {
  redirectUri: `${location.origin}/callback`,
  onRefresh: refreshes.handleRefresh,
  onRefreshFailure: refreshes.handleRefreshFailure,
});

export const anchor = new Anchor({
  adapter: workos({ sdk: client, refreshes, tokens: { api: accessToken() } }),
});

await anchor.start();
```

To run callbacks of your own as well, call the relay's from them:

<!-- snippet: fragment -->

```ts
const client = await createClient(clientId, {
  onRefresh: (response) => {
    refreshes.handleRefresh(response);
    analytics.identify(response.user.id);
  },
  onRefreshFailure: ({ signIn }) => {
    refreshes.handleRefreshFailure();
    showSignInPrompt(signIn);
  },
});
```

The client exposes no getter for the organization or the impersonator, and reading them from the access token would mean decoding a token, which Anchor never does. A client created without the relay's `onRefresh` leaves the organization unknown, so the adapter refuses the session: the read fails, with a `TypeError` naming the missing callback as its `cause`. AuthKit reports nothing when you call its `signOut()` yourself, so call `anchor.sync()` after it, or end the session with `session.end()`.

## Options

| Option      | Type                                | Default                          | What it does                                                                        |
| ----------- | ----------------------------------- | -------------------------------- | ----------------------------------------------------------------------------------- |
| `sdk`       | the AuthKit client                  | required                         | The client `createClient()` returned.                                               |
| `refreshes` | `WorkosRefreshes`                   | required                         | The relay `workosRefreshes()` returned, whose handlers the client was created with. |
| `user`      | `(user: User) => TUser`             | a snapshot of the profile fields | Maps the AuthKit user to the plain data a session carries.                          |
| `tokens`    | `Record<string, WorkosAccessToken>` | none                             | The token profiles, each `accessToken()`.                                           |

## Capabilities

| Capability           | WorkOS AuthKit                                                                                                                                                                    |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Observation          | Invalidation, through the relay: every sign-in, refresh, `switchToOrganization()` and refresh failure. A `signOut()` you call yourself reports nothing: `anchor.sync()` after it. |
| Token profiles       | `accessToken()`: the AuthKit access token.                                                                                                                                        |
| Forced refresh       | Yes: `getAccessToken({ forceRefresh: true })`.                                                                                                                                    |
| End                  | Local: AuthKit's session is cleared. Remote: unknown, since AuthKit sends WorkOS its logout request without CORS and cannot read the answer.                                      |
| Navigation after end | Never: `signOut({ navigate: false })`.                                                                                                                                            |
| Runtimes             | Browsers.                                                                                                                                                                         |

## How a session is mapped

| Session               | From AuthKit                                                                                                                         |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `principal.authority` | `workos`                                                                                                                             |
| `principal.subject`   | `user.id`, such as `user_01H...`                                                                                                     |
| `principal.tenant`    | `null`                                                                                                                               |
| context               | the `organizationId` and the impersonator's `email` of the latest refresh: another organization or an impersonation is a new session |
| `user`                | `{ id, email, emailVerified, firstName, lastName, profilePictureUrl, externalId }`, or your mapper's result                          |
| `guest`               | `false`                                                                                                                              |
| `impersonated`        | `true` while the latest refresh names an impersonator                                                                                |

AuthKit exposes no issuer without decoding its access token, so the authority is `workos` for every environment; WorkOS user ids are unique across environments. The WorkOS session id lives only in the access token, so it is not part of the context either. Every AuthKit sign-in returns through a redirect, so a new sign-in is a new page, and a new Anchor, anyway.

## Tokens

`session.getToken(profile)` checks that AuthKit still holds the session's user, organization and impersonator, then calls `getAccessToken({ forceRefresh })`: AuthKit answers the token it holds, and refreshes it first when it is about to expire or the caller asks for `forceRefresh`. The token's `kind` is `access-token` and its `scheme` is `Bearer`. A refresh may switch the organization while the token is minted, as `switchToOrganization()` does, so the session is checked again once the token arrives.

A refresh WorkOS refuses clears AuthKit's session and calls `onRefreshFailure` before `getAccessToken()` rejects, so the session is signed out first and the token rejects with `SESSION_CHANGED`: call `anchor.native.signIn()` yourself. The adapter answers AuthKit's `LoginRequiredError` with `INTERACTION_REQUIRED`, which reaches a caller whose session is still current, as it does when the client was created without the relay's `onRefreshFailure`. A failure AuthKit keeps the session through, a network error, a 429 or a 5xx, rejects with `TOKEN_FAILED` and AuthKit's error as its `cause`.

## Ending the session

`session.end()` acts only while AuthKit holds the session's user, organization and impersonator. It calls `signOut({ navigate: false })`: AuthKit clears the session it holds, the refresh token it keeps in `localStorage` in development mode included, and fetches its logout page without CORS instead of opening it. The answer is `{ local: "completed", remote: "unknown", navigation: null }`: AuthKit ignores the answer to that request and cannot read it.

WorkOS ends its session when the request reaches it. When it does not, the refresh cookie WorkOS keeps in production survives, AuthKit's own state stays authenticated after `signOut()`, and its next `getAccessToken()`, the one a read makes included, refreshes the session back. To finish the ending in the browser, call `anchor.native.signOut()` instead of `session.end()`: it opens WorkOS's logout page, and the page it returns to starts signed out. When AuthKit holds another user or organization, the adapter signs nobody out and answers `not-applicable`.

## What Anchor does not normalize

Sign-in and sign-up redirects, `getSignInUrl()` and `getSignUpUrl()`, the redirect callback and `onRedirectCallback`, `switchToOrganization()`, the roles, permissions and feature flags in the access token (`getClaims()`), development mode's refresh token storage, the automatic refresh and `dispose()` stay with authkit-js. Read them through `anchor.native`.

## Behavior

- The factory is cold: creating the adapter touches nothing on the client or the relay.
- `open` subscribes to the relay, and every refresh or refresh failure asks Anchor for a read; one that finds the same user and organization publishes nothing. `dispose()` unsubscribes.
- A read answers the user AuthKit holds in memory, with the organization and impersonator of the latest refresh. Without a user it asks `getAccessToken()`, because AuthKit also holds no user after a first refresh that failed on the network: only its `LoginRequiredError`, once WorkOS refused the refresh or there is nothing to refresh, is `signed-out`. Any other failure fails the read, so the first state is then `unavailable`, never `signed-out`.
- For a visitor who never signed in, that asks WorkOS for a refresh once; AuthKit remembers the refusal and does not ask again.
- The adapter never calls `dispose()`, which clears AuthKit's session, and never keeps a token: the relay keeps only the organization and the impersonator of the latest refresh.

## Tests

Unit tests run over an in-process fake modelled on authkit-js 0.20.2, including the conformance suite. The contracts file typechecks the real client `createClient()` returns and its `User`, and `createClient()` taking the relay's handlers. The real authkit-js 0.20.2 runs in jsdom against an in-process WorkOS API: a sign-in through its redirect callback in the organization its `onRefresh` reported, an organization switch through `switchToOrganization()` as a new session, the stored and forced tokens through the refresh token grant, a visitor signed out once WorkOS refused the refresh AuthKit tried, a first refresh the network failed as `unavailable` until a read gets through, a refresh WorkOS refused signing the session out through `onRefreshFailure`, ending without navigation through the logout request, and `dispose()` unsubscribing. Production's cookie mode, where WorkOS keeps the refresh token in a cookie, the hosted sign-in pages and a real WorkOS environment were not run.

## License

MIT
