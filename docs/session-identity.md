---
description: "What a session carries, its principal and security context, exactly when a session is replaced, and what session.key is safe for: caches and per-session scopes, not durable per-user storage."
---

# Session identity and session.key

A session in `signed-in` or `action-required` carries who it is and what it may do:

| Member         | What it is                                                                                                       |
| -------------- | ---------------------------------------------------------------------------------------------------------------- |
| `key`          | A random identifier of this security context, new whenever the context changes.                                  |
| `principal`    | `{ authority, subject, tenant }`: who issued the identity, the provider's stable user id, its tenant or `null`.  |
| `user`         | A frozen copy of the plain data the adapter mapped, typed by the adapter or your `user` mapper.                  |
| `guest`        | An anonymous or guest session, such as a Firebase anonymous user.                                                |
| `impersonated` | Someone else acts in this session, such as an administrator through Clerk's actor or Better Auth's admin plugin. |
| `getToken`     | Mints a token of a declared profile for this session only. See [token profiles](token-profiles.md).              |
| `end`          | Ends this session only. See [ending a session](ending-a-session.md).                                             |

The session carries no token, no provider object and not the adapter's context fingerprint.

## The security context

The security context is the principal (authority, tenant and subject), the adapter's `context` fingerprint (organization, provider session, impersonator), `guest` and `impersonated`. A change of any part replaces the session:

- the new session gets a new `key` and a new generation;
- the replaced session's pending token requests reject with `SESSION_CHANGED` and their adapter signals abort;
- a late answer for the replaced session is ignored, and a reference to it can neither mint nor end anything for the new one: its `getToken` rejects and its `end()` answers `not-applicable` without calling the adapter.

So a guest upgrading to an account is a replacement, and so is the same user switching organizations or starting another login where the provider tells logins apart.

The same context keeps its key and generation while the user's data changes, and while the status moves between `signed-in` and `action-required`. A new session object is published only when something in it changed structurally, so a token refresh re-renders nothing. `getToken` and `end` are the same functions across the updates of one session.

## What each adapter maps

| Adapter                                                 | `authority`                                  | `subject`                        | `tenant`        | Context fingerprint                                               |
| ------------------------------------------------------- | -------------------------------------------- | -------------------------------- | --------------- | ----------------------------------------------------------------- |
| [Firebase](adapters/firebase.md), on React Native too   | `https://securetoken.google.com/<projectId>` | `user.uid`                       | `user.tenantId` | none                                                              |
| [Supabase](adapters/supabase.md)                        | `supabase`                                   | `session.user.id`                | `null`          | none                                                              |
| [Auth0](adapters/auth0.md)                              | the ID token's `iss`                         | `sub`                            | `null`          | `org_id`, `sid`                                                   |
| [Auth0 on React Native](adapters/auth0-react-native.md) | `https://<domain>/`                          | `sub`                            | `null`          | `org_id`                                                          |
| [Better Auth](adapters/better-auth.md)                  | `better-auth`                                | `user.id`                        | `null`          | the active organization, the active team, the Better Auth session |
| [Clerk](adapters/clerk.md)                              | `https://<frontendApi>`                      | `user.id`                        | `null`          | the active organization, the Clerk session, the actor             |
| [Microsoft Entra ID](adapters/msal.md)                  | the account's `environment`                  | `homeAccountId`                  | `tenantId`      | the ID token's `sid`                                              |
| [Amazon Cognito](adapters/amplify.md)                   | the ID token's `iss`, the user pool          | the ID token's `sub`             | `null`          | the ID token's `origin_jti`                                       |
| [WorkOS AuthKit](adapters/workos.md)                    | `workos`                                     | `user.id`                        | `null`          | the organization and the impersonator of the latest refresh       |
| [Auth.js](adapters/authjs.md)                           | `authjs`                                     | the `user.id` your callback adds | `null`          | none                                                              |
| [OpenID Connect](adapters/oidc.md)                      | the ID token's `iss`                         | `sub`                            | `null`          | `org_id`, `organization`, `sid`, `act`                            |
| [Keycloak](adapters/keycloak.md)                        | the access token's `iss`                     | `sub`                            | `null`          | `organization`, `sid`                                             |
| [Okta](adapters/okta.md)                                | the ID token's `iss`                         | `sub`                            | `null`          | `sid`                                                             |
| [Your own backend](adapters/http.md)                    | the `authority` you name                     | your `subject`                   | your `tenant`   | your `context`                                                    |

Each server adapter maps a session as its client adapter does, so one user is one principal on both sides; each page says where the two differ.

## The key

`session.key` is opaque, local to this Anchor and random: `crypto.randomUUID()` where it exists, a random version 4 UUID where it does not, as on Hermes. A key is never reused, within a process or across restarts. It is an identifier, not a secret, and it appears in diagnostics.

Because it is random, the same user gets a new key after every sign-out and sign-in, every page load and every app restart. That makes it the right scope for anything that must never outlive the session or reach the next one: a query cache, an in-memory store, a realtime connection, a draft in `sessionStorage`. It is the wrong key for anything that should survive a restart, such as a user's preferences: scope those by the principal instead.

```ts
import type { Principal, SessionState } from "@priemskiyyy/anchor";

const getSessionKey = <TUser, TProfile extends string>(
  state: SessionState<TUser, TProfile>,
) => {
  if (state.status === "signed-in" || state.status === "action-required") {
    return state.session.key;
  }

  return null;
};

export const getUserScope = ({ authority, tenant, subject }: Principal) =>
  ["users", authority, ...(tenant === null ? [] : [tenant]), subject]
    .map(encodeURIComponent)
    .join(":");

const projectsBySession = new Map<string, Promise<Response>>();

anchor.session.subscribe(() => {
  const key = getSessionKey(anchor.session.get());

  for (const cachedKey of projectsBySession.keys()) {
    if (cachedKey === key) {
      continue;
    }

    projectsBySession.delete(cachedKey);
  }
});
```

A query keyed by `session.key`, such as `queryKey: ["projects", session.key]` in TanStack Query, can never pair one session's data with another session's token: when the key changes, the query is a new one, and the old session's pending token rejects. [Silo](silo.md) and [Simulcast](simulcast.md) show the same rule for stored values and realtime connections.

## Next

[Token profiles](token-profiles.md) and [ending a session](ending-a-session.md) describe the two operations bound to a session. [Race conditions and guarantees](race-conditions.md) lists the tests behind every rule on this page.
