# Changelog

## @priemskiyyy/anchor 0.1.0 - Unreleased

- First release. `Anchor` gives application code one typed, reactive, race-safe view of the current session over one provider adapter: `initializing`, `signed-out`, `signed-in`, `action-required` or `unavailable`, where a failure to read is never taken for a sign-out.
- A session carries its principal, its user as frozen plain data, and a random `key` that changes exactly when the security context does: another user, tenant, organization, provider session, guest upgrade or impersonation.
- `session.getToken(profile)` mints a token of a declared profile for that session only. Concurrent callers of one profile share one request, each may abort its own wait, and pending work rejects with `SESSION_CHANGED` once the session is replaced or ended.
- `session.end()` ends this session in this application, never every device or the identity provider, and answers what it proved: `local` and `remote`, each `completed`, `not-applicable` or `unknown`, and a `navigation` page to open when the provider needs one.
- `start()`, `sync()` and `dispose()` own the lifecycle. Pushes during the adapter's `open` are buffered, reads are coalesced to one active and one queued, and a commit is accepted only in revision order.
- `hints` install reasons to read again, such as the page becoming visible, from `start()` to `dispose()`; a hint sees only the session's status and key.
- Errors are `AnchorError`s with a `code`. Only `INVALID_CONFIGURATION` throws synchronously, from the constructor.
- Passive diagnostics: a frozen snapshot and an event stream that never start Anchor, call the provider or carry a token, user data or a provider error.
- An adapter is a plain `{ name, native, tokens, open }`. `createMockAdapter` is under `./mock`, and the `testSessionAdapter` conformance suite under `./testing`.
- Runs on Hermes: a session key falls back to a random version 4 UUID without `crypto.randomUUID`, and nothing uses the `AbortSignal` members React Native lacks.

## @priemskiyyy/anchor-react 0.1.0 - Unreleased

- First release. `AnchorProvider`, `useAnchor` and `useSession`, with an optional selector compared by `Object.is`.
- The provider owns no lifetime: it never starts or disposes the Anchor, so Strict Mode's double mount and every unmount leave it alone. `useSession` reads `initializing` on the server and until mounted.
- `Register` types every export with the application's Anchor. Works on React Native unchanged.
- Requires `@priemskiyyy/anchor` 0.1 and React 19.2.

## @priemskiyyy/anchor-vue 0.1.0 - Unreleased

- First release. `AnchorProvider`, `useAnchor` and `useSession`, in Vue's composable idiom, `useSession` answering a read-only computed ref.
- The provider owns no lifetime. `useSession` reads `initializing` on the server and until mounted, so hydration never mismatches.
- Requires `@priemskiyyy/anchor` 0.1 and Vue 3.5.

## @priemskiyyy/anchor-solid 0.1.0 - Unreleased

- First release. `AnchorProvider`, `useAnchor` and `useSession`, as Solid primitives answering accessors.
- The provider owns no lifetime. `useSession` reads `initializing` on the server and until mounted.
- Requires `@priemskiyyy/anchor` 0.1 and Solid 1.9.

## @priemskiyyy/anchor-svelte 0.1.0 - Unreleased

- First release. `AnchorProvider`, `useAnchor` and `useSession`, over Svelte 5 runes, `useSession` answering a value read through `current`. Ships Svelte sources for the application's compiler.
- The provider owns no lifetime. `useSession` reads `initializing` on the server and until mounted.
- Requires `@priemskiyyy/anchor` 0.1 and Svelte 5.7.

## @priemskiyyy/anchor-devtools 0.1.0 - Unreleased

- First release. A framework-independent inspector in a shadow root: the lifecycle, the adapter, the session's status, key and generation, the operations in flight, and a searchable, filterable timeline with pause and clear. The principal stays hidden until values are shown, and nothing in it ever carries a token, the user's data or a provider error.
- It reads `anchor.diagnostics` and nothing else, subscribes only while mounted, and creates no provider demand.
- Wrappers under `./react`, `./vue`, `./solid` and `./svelte` that read the Anchor from their provider and render an empty host on the server.
- Requires `@priemskiyyy/anchor` 0.1, and Svelte 5.29 where the Svelte wrapper is used.

## @priemskiyyy/anchor-browser 0.1.0 - Unreleased

- First release. `visibility()`, `online()` and `crossTab({ name })` hints: read the session again when the page becomes visible, when the browser comes back online, or when another tab's session changes status or key. A cross-tab message carries no token, key or state.
- Requires `@priemskiyyy/anchor` 0.1.

## @priemskiyyy/anchor-react-native 0.1.0 - Unreleased

- First release. `appState({ sdk: AppState })` reads the session again each time the app returns to the foreground.
- Requires `@priemskiyyy/anchor` 0.1.

## @priemskiyyy/anchor-server 0.1.0 - Unreleased

- First release. `getRequestSession(request, { adapter })` reads one request's session through a server adapter, with the headers the provider wants set on the response, kept even when the read fails, and nothing shared between requests. `getSessionHydration(state, { select })` answers what of it may go on the page, never a token, a cookie, SDK state or a provider error.
- `testServerSessionAdapter` under `./testing`, the conformance suite every server adapter passes.
- Requires `@priemskiyyy/anchor` 0.1.

## @priemskiyyy/anchor-firebase 0.1.0 - Unreleased

- First release, for the Firebase JS SDK's modular Auth. `onIdTokenChanged` pushes, the first read waits for `authStateReady()`, `idToken()` mints the user's ID token, and ending signs out of this app only.
- Requires `@priemskiyyy/anchor` 0.1.

## @priemskiyyy/anchor-firebase-react-native 0.1.0 - Unreleased

- First release, for React Native Firebase 26's modular Auth. `onIdTokenChanged` pushes, the first read waits for `authStateReady()`, and `idToken()` answers a token only when the claims the native SDK decoded from it name the session's user, since the native SDK mints for whichever user it holds.
- Ending signs this app out on this device only, and signs nobody out when the native SDK holds another user.
- Requires `@priemskiyyy/anchor` 0.1.

## @priemskiyyy/anchor-supabase 0.1.0 - Unreleased

- First release, for supabase-js 2.27 and later, the first to require a client whose sign-out takes a scope. `onAuthStateChange` pushes, `accessToken()` mints the session's access token, refreshed only for the session's own user, and ending uses the `local` sign-out scope, never Supabase's `global` default.
- Requires `@priemskiyyy/anchor` 0.1.

## @priemskiyyy/anchor-auth0 0.1.0 - Unreleased

- First release, for auth0-spa-js 2.4 and later, the first to answer a token's type. The cached ID token is the session, `accessToken({ audience, scope })` mints through `getTokenSilently`, a login Auth0 requires is `INTERACTION_REQUIRED`, a token the silent iframe minted for a login made in another tab meanwhile rejects with `SESSION_CHANGED`, and ending clears the client and hands back Auth0's logout page as `navigation`.
- Requires `@priemskiyyy/anchor` 0.1.

## @priemskiyyy/anchor-auth0-react-native 0.1.0 - Unreleased

- First release, for react-native-auth0 5.8 and later. The credentials manager's stored login is the session, read again on `anchor.sync()` because react-native-auth0 emits no events, and a renewal Auth0 refuses is `INTERACTION_REQUIRED`.
- `accessToken()` answers the login's access token, and `accessToken({ audience, scope })` one API's through `getApiCredentials`. That cache names no user, so a login's first mint for each audience clears it, and exchanges run one at a time: another login's cached API token is never answered.
- Ending clears each declared audience's API credentials and the login on the device, and answers Auth0's own session as `unknown`.
- Requires `@priemskiyyy/anchor` 0.1.

## @priemskiyyy/anchor-better-auth 0.1.0 - Unreleased

- First release, for better-auth 1.6 and later, the first to keep the session its atom holds through a failed fetch, over the Better Auth client of every framework, and on React Native with `@better-auth/expo`. The session atom behind `useSession` pushes every settled change and serves every read, so an offline start on React Native answers the Expo plugin's cached session, and an offline ending clears the session on the device.
- Requires `@priemskiyyy/anchor` 0.1.

## @priemskiyyy/anchor-better-auth-node 0.1.0 - Unreleased

- First release. `betterAuth({ sdk: auth })` reads one request through the server's `auth.api.getSession` for `getRequestSession` from `@priemskiyyy/anchor-server`, passing Better Auth's response headers on, the cookie deletions of a 401 included, and maps a session exactly as `@priemskiyyy/anchor-better-auth` does.
- Requires `@priemskiyyy/anchor` 0.1, `@priemskiyyy/anchor-server` 0.1 and better-auth 1.6 or later.

## @priemskiyyy/anchor-supabase-node 0.1.0 - Unreleased

- First release. `supabase({ sdk: (cookies) => createServerClient(url, key, { cookies }) })` reads one request through a `@supabase/ssr` server client created over its cookies for `getRequestSession` from `@priemskiyyy/anchor-server`, verifies the session with Supabase Auth through `auth.getUser()`, never `getSession()` alone, and maps it exactly as `@priemskiyyy/anchor-supabase` does.
- The cookies Supabase refreshes or deletes, with its cache headers, reach the response, even when the read fails after a refresh rotated them. Supabase Auth refusing the session's token, user or refresh token is `signed-out`; a network failure, a `5xx` or a rate limit is `unavailable`.
- Requires `@priemskiyyy/anchor` 0.1 and `@priemskiyyy/anchor-server` 0.1.

## @priemskiyyy/anchor-firebase-node 0.1.0 - Unreleased

- First release. `firebase({ sdk: getAuth(app) })` reads one request for `getRequestSession` from `@priemskiyyy/anchor-server` by its bearer ID token or else its session cookie, `__session` unless `cookie` names another, through firebase-admin's `verifyIdToken()` and `verifySessionCookie()`, with `checkRevoked` passed on, and maps the verified claims as `@priemskiyyy/anchor-firebase` maps the same user.
- An expired, revoked, malformed, forged or foreign credential, and a disabled or deleted user, is `signed-out`; a failure to fetch Google's public keys, which firebase-admin reports under the same code as a forged credential, is `unavailable`.
- Requires `@priemskiyyy/anchor` 0.1 and `@priemskiyyy/anchor-server` 0.1.

## @priemskiyyy/anchor-clerk-node 0.1.0 - Unreleased

- First release. `clerk({ sdk: clerkClient })` reads one request, its URL, method and headers, through `@clerk/backend`'s `authenticateRequest()` for `getRequestSession` from `@priemskiyyy/anchor-server`, fetches its user from the Backend API, and maps its organization, actor and pending status as `@priemskiyyy/anchor-clerk` does.
- Clerk's response headers reach the response in every case. A handshake Clerk needs is `unavailable` with `INTERACTION_REQUIRED`, its redirect in the headers; a signed-out answer Clerk gives only because it could not verify the token is `unavailable`, never `signed-out`.
- Requires `@priemskiyyy/anchor` 0.1 and `@priemskiyyy/anchor-server` 0.1.

## @priemskiyyy/anchor-workos-node 0.1.0 - Unreleased

- First release. `workos({ sdk: workos, cookiePassword })` reads one request's sealed session cookie, `wos-session` unless `cookie` names another, through `@workos-inc/node`'s `loadSealedSession()` for `getRequestSession` from `@priemskiyyy/anchor-server`, and maps it as `@priemskiyyy/anchor-workos` maps the same user.
- An expired session is refreshed and its newly sealed cookie reaches the response, even when the read fails after the refresh; a refresh WorkOS refuses for good is `signed-out` and deletes the cookie, and one that may pass is `unavailable`.
- Requires `@priemskiyyy/anchor` 0.1 and `@priemskiyyy/anchor-server` 0.1.

## @priemskiyyy/anchor-oidc 0.1.0 - Unreleased

- First release, for oidc-client-ts 3, over the `UserManager` you configure for any OpenID Connect provider. `userLoaded` and `userUnloaded` push, and `userSignedOut` asks for a read, because the session monitor also raises it when its check merely fails.
- `accessToken()` renews through `signinSilent()` when forced or expired, and the renewed user must still be the session's issuer, subject and context. A login the provider requires is `INTERACTION_REQUIRED`.
- Ending removes the user and hands back the provider's end-session page as `navigation`, built from its discovery document.
- Requires `@priemskiyyy/anchor` 0.1.

## @priemskiyyy/anchor-keycloak 0.1.0 - Unreleased

- First release, for keycloak-js 26. The callbacks you assigned stay chained, with Anchor's first, and are restored on dispose. `initialized` takes the promise `init()` returned, so an Anchor started while `init()` runs is never signed out early; once `init()` was called, it is required.
- `accessToken()` refreshes through `updateToken()`, forced with `-1`. Ending clears the tokens and hands back Keycloak's logout page, and never calls `logout()`, which navigates.
- Requires `@priemskiyyy/anchor` 0.1.

## @priemskiyyy/anchor-okta 0.1.0 - Unreleased

- First release, for okta-auth-js 8. The auth state manager pushes, a read follows Okta's own `updateAuthState()`, and `accessToken()` mints from the token manager, renewed when forced. A renewal that failed on the way, offline for one, leaves Okta's refresh token and so the session; only one Okta refused as invalid signs it out.
- Ending revokes the refresh and access tokens, clears them only while they still belong to the session, and hands back Okta's sign-out page.
- Requires `@priemskiyyy/anchor` 0.1.

## @priemskiyyy/anchor-clerk 0.1.0 - Unreleased

- First release, for clerk-js 6 and Clerk Expo, which runs it. The listener pushes, every read, token and ending waits for `loaded`, a `pending` session is `action-required` with its task as the action, and the organization and the actor are in the context.
- `sessionToken({ template })` mints `session.getToken({ template, skipCache })` for the session's id and user only. Ending signs out exactly that session and answers what clerk-js proved, `remote: "unknown"` when it could not reach Clerk.
- Requires `@priemskiyyy/anchor` 0.1.

## @priemskiyyy/anchor-workos 0.1.0 - Unreleased

- First release, for authkit-js 0.20.2 and later, the first to keep its session through a transient refresh failure. `workosRefreshes()` relays the callbacks AuthKit accepts only in `createClient()`, and each refresh asks Anchor for a read. The organization is in the context, so another organization is a new session.
- `accessToken()` mints `getAccessToken()` for the session's user. Ending signs out without navigating and answers local completed, remote unknown.
- Requires `@priemskiyyy/anchor` 0.1.

## @priemskiyyy/anchor-authjs 0.1.0 - Unreleased

- First release, for next-auth 4's client. Reads ask `{basePath}/session` itself, so a failed request is never taken for a sign-out, and another tab's change arrives through next-auth's broadcast. A session without the user id your session callback adds is refused.
- Ending signs out without a redirect and reads the session again, so a sign-out the server refused rejects with `END_FAILED`.
- Requires `@priemskiyyy/anchor` 0.1.

## @priemskiyyy/anchor-msal 0.1.0 - Unreleased

- First release, for msal-browser 5, and `@azure/msal-react`, which uses the same client. The active account you chose with `setActiveAccount()` is the session, named by MSAL's own account key, with the ID token's `sid` as its context. MSAL's events ask for a read, and `initialized` takes the promise `initialize()` returned.
- `accessToken({ scopes })` mints through `acquireTokenSilent` for exactly the session's account, and MSAL's `InteractionRequiredAuthError` is `INTERACTION_REQUIRED`.
- Ending clears that account alone from MSAL's cache, without navigating, and answers the Microsoft Entra session as `unknown`: msal-browser 5 lets only its configuration capture the logout page, so call `logoutRedirect()` to end that too.
- Requires `@priemskiyyy/anchor` 0.1.

## @priemskiyyy/anchor-amplify 0.1.0 - Unreleased

- First release, for aws-amplify 6.15.8 and later, the first to keep its tokens through a refresh error that is no refusal, over Amplify v6's Auth functions and Hub, on the web and on React Native. `getCurrentUser()` names the session, the ID token's `origin_jti` fingerprints the sign-in, every Hub auth event asks for a read, and Amplify's `signedOut` is signed out at once. An Amplify without a user pool is `unavailable`, never signed out.
- `accessToken()` and `idToken()` mint through `fetchAuthSession()` for the session's user only.
- Ending signs this device out with `signOut({ global: false })` and answers `local: "unknown"` when Amplify never said `signedOut`, as when a React Native user closes the hosted UI's logout page.
- Requires `@priemskiyyy/anchor` 0.1.

## @priemskiyyy/anchor-http 0.1.0 - Unreleased

- First release. Your own backend as the session provider through your own client: `read`, one function per token profile and `end`, each bound to the session that asked: a token minted for another subject, or for another tenant or context when the minter names them, rejects with `SESSION_CHANGED`.
- Requires `@priemskiyyy/anchor` 0.1.
