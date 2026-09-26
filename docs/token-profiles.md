---
description: "Declare token profiles on the adapter, mint them from the session they belong to, share and abort requests, force a refresh, and handle every rejection, with each adapter's profile helpers."
---

# Token profiles

A token profile is a named kind of token the adapter mints: the user's ID token, an access token for one API's audience, a Clerk JWT template. You declare the profiles when you create the adapter, and the names are yours:

```ts
import { Anchor } from "@priemskiyyy/anchor";
import { accessToken, auth0 } from "@priemskiyyy/anchor-auth0";
import { createAuth0Client } from "@auth0/auth0-spa-js";

const client = await createAuth0Client({ domain, clientId });

export const auth0Anchor = new Anchor({
  adapter: auth0({
    sdk: client,
    tokens: {
      projects: accessToken({ audience: "https://api.example.com" }),
      billing: accessToken({
        audience: "https://billing.example.com",
        scope: "read:invoices",
      }),
    },
  }),
});
```

`session.getToken("projects")` then types only `projects` and `billing`. A name the adapter does not declare is a type error, and at runtime a rejection with `INVALID_CONFIGURATION`.

## Asking for a token

```ts
const loadProjects = async (signal: AbortSignal) => {
  const state = anchor.session.get();

  if (state.status !== "signed-in") {
    return null;
  }

  const token = await state.session.getToken("api", { signal });

  return fetch("/api/projects", {
    headers: { authorization: `${token.scheme ?? "Bearer"} ${token.value}` },
    signal,
  });
};
```

A token is `{ value, kind, scheme }`: `kind` is `access-token`, `id-token`, `session-token` or a kind of the adapter's own, and `scheme` is the authorization scheme the provider names, such as `Bearer` or `DPoP`, or `null` when it names none. Anchor never decodes a token and never assumes it is a JWT or a bearer credential. It never attaches a token to a request either: that stays with your client.

`getToken(profile, { signal, forceRefresh })`:

1. Rejects at once with `DISPOSED` after `dispose()`, `SESSION_CHANGED` when the session was replaced, ended or is ending, `ACTION_REQUIRED` while the state is `action-required`, `INVALID_CONFIGURATION` for an undeclared profile, `UNSUPPORTED` when the adapter has no `getToken`, and `ABORTED` when `signal` already aborted.
2. Joins a request in flight for the same session, profile and `forceRefresh`, or starts one. A forced request never joins a normal one, and a normal one never joins a forced one.
3. Calls the adapter with the session's identity, so the adapter mints for exactly this session and refuses with `SESSION_CHANGED` when its SDK already holds someone else.
4. Checks the answer, then checks that the session is still current and signed in, and resolves every waiter with one frozen token.

While it runs:

- when the session is replaced, ended or disposed, every waiter rejects at once and the adapter's signal aborts; the late answer is ignored;
- one caller's abort rejects only that caller, with `ABORTED` and no cause, and when the last waiter leaves, the adapter's signal aborts and the request is forgotten;
- the [timeout](session-state.md#the-lifecycle) rejects every waiter with `TIMEOUT` and aborts the adapter's signal.

Anchor keeps no token once a request settles. Caching and refresh are the provider SDK's, so asking again is cheap wherever the SDK caches.

## Forcing a refresh

`forceRefresh: true` asks the SDK for a fresh token instead of a cached one, such as after your API refused a token it thinks expired:

```ts
const fetchProjects = async (signal: AbortSignal) => {
  const token = await session.getToken("api", { signal });

  const response = await fetch("/api/projects", {
    headers: { authorization: `Bearer ${token.value}` },
    signal,
  });

  if (response.status !== 401) {
    return response;
  }

  const fresh = await session.getToken("api", { signal, forceRefresh: true });

  return fetch("/api/projects", {
    headers: { authorization: `Bearer ${fresh.value}` },
    signal,
  });
};
```

An adapter whose SDK cannot honor it rejects with `UNSUPPORTED`, as Keycloak's does without a refresh token.

## When the provider needs the user

Anchor never starts interactive UI. A provider that needs the user before it mints, such as Auth0's `login_required` or MSAL's `InteractionRequiredAuthError`, rejects with `INTERACTION_REQUIRED`, and the application decides what to show:

```ts
import { AnchorError } from "@priemskiyyy/anchor";

const getApiToken = async () => {
  try {
    return await session.getToken("api");
  } catch (error) {
    if (!(error instanceof AnchorError)) {
      throw error;
    }

    if (error.code === "SESSION_CHANGED") {
      return null;
    }

    if (error.code === "INTERACTION_REQUIRED") {
      showSignInAgainPrompt();

      return null;
    }

    throw error;
  }
};
```

`TOKEN_FAILED` covers every other failure, with the SDK's error as its `cause`. See [errors](errors.md).

## The profiles of each adapter

| Adapter                                                               | Profile helpers                                                   | `kind`, `scheme`                             | Forced refresh                                                            |
| --------------------------------------------------------------------- | ----------------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------- |
| [Firebase](adapters/firebase.md)                                      | `idToken()`                                                       | `id-token`, `Bearer`                         | `user.getIdToken(true)`                                                   |
| [Firebase on React Native](adapters/firebase-react-native.md)         | `idToken()`                                                       | `id-token`, `Bearer`                         | `user.getIdTokenResult(true)`                                             |
| [Supabase](adapters/supabase.md)                                      | `accessToken()`                                                   | `access-token`, the session's `token_type`   | `auth.refreshSession()`                                                   |
| [Auth0](adapters/auth0.md)                                            | `accessToken({ audience, scope })`                                | `access-token`, `Bearer` or `DPoP`           | `cacheMode: "off"`                                                        |
| [Auth0 on React Native](adapters/auth0-react-native.md)               | `accessToken()` for the login, `accessToken({ audience, scope })` | `access-token`, `DPoP` or `Bearer`           | `getCredentials()` forced; for an audience, `clearApiCredentials()` first |
| [Clerk](adapters/clerk.md)                                            | `sessionToken({ template })`                                      | `session-token`, `Bearer`                    | `getToken({ skipCache: true })`                                           |
| [Microsoft Entra ID](adapters/msal.md)                                | `accessToken({ scopes })`                                         | `access-token`, MSAL's `tokenType`           | `acquireTokenSilent({ forceRefresh: true })`                              |
| [Amazon Cognito](adapters/amplify.md)                                 | `accessToken()`, `idToken()`                                      | `access-token`, `Bearer`; `id-token`, `null` | `fetchAuthSession({ forceRefresh: true })`                                |
| [WorkOS AuthKit](adapters/workos.md)                                  | `accessToken()`                                                   | `access-token`, `Bearer`                     | `getAccessToken({ forceRefresh: true })`                                  |
| [OpenID Connect](adapters/oidc.md)                                    | `accessToken()`                                                   | `access-token`, `Bearer` or `DPoP`           | `signinSilent()`                                                          |
| [Keycloak](adapters/keycloak.md)                                      | `accessToken()`                                                   | `access-token`, `Bearer`                     | `updateToken(-1)`, `UNSUPPORTED` without a refresh token                  |
| [Okta](adapters/okta.md)                                              | `accessToken()`                                                   | `access-token`, `Bearer` or `DPoP`           | `tokenManager.renew()`                                                    |
| [Your own backend](adapters/http.md)                                  | a function of yours per profile                                   | yours, `access-token` and `null` by default  | passed on as `forceRefresh`                                               |
| [Better Auth](adapters/better-auth.md), [Auth.js](adapters/authjs.md) | none: API calls carry the session cookie                          |                                              |                                                                           |
