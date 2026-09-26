---
description: "What session.end() ends and never ends, the local, remote and navigation steps it reports, how each adapter answers, and where global sign-out stays with your SDK."
---

# Ending a session

`session.end()` ends this session in this application. It never signs out every device and never ends the identity provider's own session behind your back, and it answers what it proved.

```ts
const handleSignOutPress = async () => {
  const result = await session.end();

  if (result.navigation !== null) {
    location.assign(result.navigation.url);
  }
};
```

## The result

```ts
import type { EndResult } from "@priemskiyyy/anchor";

const describeEnding = ({ local, remote }: EndResult) =>
  `This device: ${local}. The provider: ${remote}.`;
```

| Field        | Values                                   | Meaning                                                                                                    |
| ------------ | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `local`      | `completed`, `not-applicable`, `unknown` | Whether the session was ended in this application, on this device.                                         |
| `remote`     | `completed`, `not-applicable`, `unknown` | Whether the provider's server ended it too. `not-applicable` when the provider has no such step.           |
| `navigation` | `{ url }` or `null`                      | A page the application must open to finish, such as Auth0's logout endpoint. Anchor never opens it itself. |

A partial success is an answer, not an error: an adapter that cleared the local session but could not tell whether the server revoked it answers `local: "completed"`, `remote: "unknown"`.

## What happens

1. After `dispose()`, `end()` rejects with `DISPOSED`. On a session that is no longer current it resolves `{ local: "not-applicable", remote: "not-applicable", navigation: null }` without calling the adapter. A second `end()` while one runs joins it, and an adapter without `end` rejects with `UNSUPPORTED`.
2. The session becomes ending: its pending token requests reject with `SESSION_CHANGED`, and new ones are refused.
3. The adapter ends the session through its SDK's narrowest sign-out, and only while the SDK still holds this session's identity: when it holds someone else, it signs nobody out and answers `not-applicable`. Its signal aborts if the session is replaced or Anchor is disposed meanwhile.
4. When `local` is `completed` and the session is still current, Anchor publishes `signed-out` itself: the adapter's answer is the evidence. Otherwise the session becomes usable again and Anchor reads the provider to reconcile.
5. An adapter that throws rejects `end()` with `END_FAILED` and the SDK's error as its `cause`, and the session becomes usable again until a read says otherwise.
6. An answer that arrives after the session was replaced resolves its caller and changes nothing.

`dispose()` never ends a session.

## What each adapter answers

| Adapter                                                 | Signs out with                                                     | `local`                                                   | `remote`                                          | `navigation`                    |
| ------------------------------------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------- | ------------------------------------------------- | ------------------------------- |
| [Firebase](adapters/firebase.md), on React Native too   | `signOut()`                                                        | `completed`                                               | `not-applicable`                                  | `null`                          |
| [Supabase](adapters/supabase.md)                        | `auth.signOut({ scope: "local" })`, never the `global` default     | `completed`                                               | `completed`                                       | `null`                          |
| [Auth0](adapters/auth0.md)                              | `logout({ openUrl })`, capturing the URL                           | `completed`                                               | `unknown`                                         | Auth0's `/v2/logout` page       |
| [Auth0 on React Native](adapters/auth0-react-native.md) | `clearApiCredentials()` per audience, then `clearCredentials()`    | `completed`                                               | `unknown`                                         | `null`                          |
| [Better Auth](adapters/better-auth.md)                  | `signOut()`                                                        | `completed`                                               | `completed`, or `unknown` offline on React Native | `null`                          |
| [Clerk](adapters/clerk.md)                              | `signOut(callback, { sessionId })`, without navigating             | `completed`                                               | `completed`, or `unknown` offline                 | `null`                          |
| [Microsoft Entra ID](adapters/msal.md)                  | `clearCache({ account })`, that account alone                      | `completed`                                               | `unknown`                                         | `null`                          |
| [Amazon Cognito](adapters/amplify.md)                   | `signOut({ global: false })`                                       | `completed` once Amplify said `signedOut`, else `unknown` | `unknown`                                         | `null`                          |
| [WorkOS AuthKit](adapters/workos.md)                    | `signOut({ navigate: false })`                                     | `completed`                                               | `unknown`                                         | `null`                          |
| [Auth.js](adapters/authjs.md)                           | `signOut({ redirect: false })`, then reads the session again       | `completed`                                               | `unknown`                                         | `null`                          |
| [OpenID Connect](adapters/oidc.md)                      | `removeUser()`                                                     | `completed`                                               | `unknown`                                         | the provider's end-session page |
| [Keycloak](adapters/keycloak.md)                        | `clearToken()`, never `logout()`, which navigates                  | `completed`                                               | `unknown`                                         | Keycloak's logout page          |
| [Okta](adapters/okta.md)                                | revokes the refresh and access tokens, then `tokenManager.clear()` | `completed`                                               | `unknown`                                         | Okta's sign-out page            |
| [Your own backend](adapters/http.md)                    | your `end({ session, signal })`                                    | `completed`                                               | `completed`                                       | `null`                          |

Each adapter's page says what it answers in the edge cases, such as a provider with no end-session endpoint.

## What stays with your SDK

Signing the user out everywhere, revoking every session and ending a federated login are provider operations with their own consequences, so Anchor leaves them to you, through `anchor.native`:

- Supabase: `anchor.native.auth.signOut({ scope: "global" })` signs the user out on every device.
- Amazon Cognito: `anchor.native.auth.signOut({ global: true })`.
- Clerk: `anchor.native.signOut()` ends every signed-in session of a multi-session application.
- Better Auth: `anchor.native.revokeOtherSessions()` ends the user's other sessions.
- Firebase: revoke a user's refresh tokens on your server with the Admin SDK's `revokeRefreshTokens`.
- Auth0 on React Native: `anchor.native.webAuth.clearSession()` ends Auth0's session in the browser the login used.
- Microsoft Entra ID: `anchor.native.logoutRedirect()` signs out of Microsoft Entra ID as well.

A session ended through `anchor.native` reaches Anchor like any other change: by push where the adapter observes, and after `anchor.sync()` where it does not.
