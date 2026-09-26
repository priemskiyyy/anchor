---
description: "Compare every Anchor adapter: how it observes its provider, the token profiles it mints, forced refresh, what an ending proves locally and remotely, navigation and runtimes, and the server adapters for request-scoped reads."
---

# Choose an adapter

An adapter translates one provider SDK onto Anchor's session contract and nothing more. You pick the one for the SDK your application already uses; your code above it, `anchor.session`, `session.getToken()` and `session.end()`, stays the same when the adapter changes.

```ts
import { Anchor } from "@priemskiyyy/anchor";
import { accessToken, oidc } from "@priemskiyyy/anchor-oidc";
import { UserManager } from "oidc-client-ts";

const userManager = new UserManager({
  authority: "https://id.example.com/realms/acme",
  client_id: "web",
  redirect_uri: `${location.origin}/callback`,
});

export const oidcAnchor = new Anchor({
  adapter: oidc({ sdk: userManager, tokens: { api: accessToken() } }),
});
```

## Client adapters

| Provider                                                      | Package                        | Observation                                                   | Token profiles                                      | Forced refresh                             | End: local and remote                                           | Navigation after end               | Runtimes                                           |
| ------------------------------------------------------------- | ------------------------------ | ------------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------ | --------------------------------------------------------------- | ---------------------------------- | -------------------------------------------------- |
| [Firebase](adapters/firebase.md)                              | `anchor-firebase`              | push, `onIdTokenChanged`                                      | `idToken()`                                         | yes                                        | local; no remote step                                           | never                              | browsers, React Native through the Firebase JS SDK |
| [Firebase on React Native](adapters/firebase-react-native.md) | `anchor-firebase-react-native` | push, `onIdTokenChanged`                                      | `idToken()`                                         | yes                                        | local, this app on this device; no remote step                  | never                              | iOS and Android                                    |
| [Supabase](adapters/supabase.md)                              | `anchor-supabase`              | push, `onAuthStateChange`                                     | `accessToken()`                                     | yes                                        | local and remote, `scope: "local"`                              | never                              | browsers, React Native and Expo, Node              |
| [Auth0](adapters/auth0.md)                                    | `anchor-auth0`                 | none: `anchor.sync()` after a login                           | `accessToken({ audience, scope })`                  | yes                                        | local; remote pending until the logout page is opened           | Auth0's `/v2/logout` page          | browsers                                           |
| [Auth0 on React Native](adapters/auth0-react-native.md)       | `anchor-auth0-react-native`    | none: `anchor.sync()` after a login                           | `accessToken()`, `accessToken({ audience, scope })` | yes                                        | local; remote unknown until `webAuth.clearSession()`            | never                              | iOS and Android                                    |
| [Better Auth](adapters/better-auth.md)                        | `anchor-better-auth`           | push, the session atom                                        | none: the session cookie                            | not applicable                             | local and remote; offline on React Native, local only           | never                              | browsers, React Native and Expo, Node              |
| [Clerk](adapters/clerk.md)                                    | `anchor-clerk`                 | push, `addListener`                                           | `sessionToken({ template })`                        | yes                                        | local and remote, `signOut({ sessionId })`; offline, local only | never                              | browsers, React Native and Expo through Clerk Expo |
| [Microsoft Entra ID](adapters/msal.md)                        | `anchor-msal`                  | invalidation, `addEventCallback`                              | `accessToken({ scopes })`                           | yes                                        | local, that account only; remote unknown                        | never                              | browsers                                           |
| [Amazon Cognito](adapters/amplify.md)                         | `anchor-amplify`               | `Hub.listen("auth")`: `signedOut` pushed, the rest invalidate | `accessToken()`, `idToken()`                        | yes                                        | local, this device; remote unknown                              | never: the hosted UI opens its own | browsers, React Native and Expo, Node              |
| [WorkOS AuthKit](adapters/workos.md)                          | `anchor-workos`                | invalidation, through the `workosRefreshes()` relay           | `accessToken()`                                     | yes                                        | local; remote unknown                                           | never                              | browsers                                           |
| [Auth.js](adapters/authjs.md)                                 | `anchor-authjs`                | invalidation from other tabs; `anchor.sync()` in the same tab | none: the session cookie                            | not applicable                             | local; remote unknown                                           | never                              | browsers                                           |
| [OpenID Connect](adapters/oidc.md)                            | `anchor-oidc`                  | push, `userLoaded` and `userUnloaded`                         | `accessToken()`                                     | yes, `signinSilent()`                      | local; remote pending until the end-session page is opened      | the provider's end-session page    | browsers                                           |
| [Keycloak](adapters/keycloak.md)                              | `anchor-keycloak`              | push, the callbacks it chains                                 | `accessToken()`                                     | yes; `UNSUPPORTED` without a refresh token | local; remote pending until the logout page is opened           | Keycloak's logout page             | browsers, Cordova                                  |
| [Okta](adapters/okta.md)                                      | `anchor-okta`                  | push, `authStateManager.subscribe`                            | `accessToken()`                                     | yes                                        | local, after revoking the tokens; remote pending                | Okta's sign-out page               | browsers, Node                                     |
| [Your own backend](adapters/http.md)                          | `anchor-http`                  | none: `anchor.sync()` after a sign-in or sign-out             | any: one function of yours per profile              | passed on as `forceRefresh`                | local and remote, once your `end` resolves                      | never                              | anywhere your client runs                          |

Every package is named `@priemskiyyy/` and the name in the table. "Push" means the adapter hands Anchor a complete answer when the SDK reports a change; "invalidation" means it asks Anchor to read; "none" means the SDK emits nothing, so call `anchor.sync()` after a native call that changes the session. Remote "pending" or "unknown" means the provider's own session may outlive the ending until the browser visits a page or the provider expires it; see [ending a session](ending-a-session.md).

## Server adapters

For request-scoped reads with [`@priemskiyyy/anchor-server`](server-rendering.md):

| Provider                                    | Package                   | Reads a request through                                         |
| ------------------------------------------- | ------------------------- | --------------------------------------------------------------- |
| [Better Auth](adapters/better-auth-node.md) | `anchor-better-auth-node` | `auth.api.getSession({ headers, returnHeaders: true })`         |
| [Firebase](adapters/firebase-node.md)       | `anchor-firebase-node`    | firebase-admin's `verifyIdToken()` and `verifySessionCookie()`  |
| [Supabase](adapters/supabase-node.md)       | `anchor-supabase-node`    | a `@supabase/ssr` server client's `auth.getUser()`              |
| [Clerk](adapters/clerk-node.md)             | `anchor-clerk-node`       | `@clerk/backend`'s `authenticateRequest()`                      |
| [WorkOS](adapters/workos-node.md)           | `anchor-workos-node`      | `@workos-inc/node`'s `loadSealedSession()` and `authenticate()` |

Each maps a session as its client adapter does, so one user is one principal on both sides. Auth.js has no server adapter yet: next-auth 4 exports no request-scoped read over a plain `Request`, and its server read answers `null` for a forged token, a throwing callback and a failing database alike, so it cannot tell no session from a failure.

## You own the SDK

Every adapter takes the SDK your application already set up as its `sdk` option, typed structurally so the adapter names only what it calls, and imports nothing from the provider at runtime. You initialize it, configure it and sign in with it; Anchor only observes and calls it. `anchor.native` is that SDK with its own type, for everything Anchor does not normalize. Creating an adapter touches nothing on the SDK, so it may run at module scope and on a server.

One package serves one SDK API. Where a provider's React Native SDK has an API of its own, as React Native Firebase and react-native-auth0 do, it has its own package whose factory keeps the provider's name. Where the SDK runs its web API on React Native, as supabase-js, Better Auth, Clerk Expo and Amplify do, the web adapter serves both. See [React Native and Expo](react-native.md).

## Something else

A provider that speaks OpenID Connect, such as Zitadel, Authentik or Cognito's hosted UI, is served by the [OpenID Connect](adapters/oidc.md) adapter over oidc-client-ts. A backend of your own is served by the [HTTP](adapters/http.md) adapter over your own client. Anything else is a small adapter of your own: see [writing an adapter](writing-an-adapter.md). To move an application from one provider to another, see [migrating between providers](migrating-between-providers.md).
