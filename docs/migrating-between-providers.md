---
description: "Move an application from one authentication provider to another: what stays the same above the adapter, and what changes with it: principals, token profiles and their tokens, observation, endings and the server side."
---

# Migrating between providers

Code that reads `anchor.session`, calls `session.getToken(profile)` and `session.end()`, and renders with a binding's `useSession()` does not change when the adapter does. What changes is what the provider is: who issues the identity, what its tokens are, whether its SDK reports changes, and what an ending can prove. This page lists each difference to check.

## Swap the adapter

Keep the profile names your code already asks for, and give them to the new adapter's helpers:

```ts
import { Anchor } from "@priemskiyyy/anchor";
import { firebase, idToken } from "@priemskiyyy/anchor-firebase";
import { getAuth } from "firebase/auth";

export const anchor = new Anchor({
  adapter: firebase({ sdk: getAuth(app), tokens: { api: idToken() } }),
});
```

```ts
import { Anchor } from "@priemskiyyy/anchor";
import { accessToken, auth0 } from "@priemskiyyy/anchor-auth0";
import { createAuth0Client } from "@auth0/auth0-spa-js";

const client = await createAuth0Client({ domain, clientId });

export const anchor = new Anchor({
  adapter: auth0({
    sdk: client,
    tokens: { api: accessToken({ audience: "https://api.example.com" }) },
  }),
});
```

The binding's `Register` block infers everything from `typeof anchor`, so the types follow: `session.user` takes the new adapter's user type, and `anchor.native` becomes the new SDK. Everything that signs in, links accounts or manages the user moves with `anchor.native`, because those calls are the provider's own.

## Principals

Every adapter names its own authority, and every provider its own subjects: `https://securetoken.google.com/<projectId>` and a Firebase `uid` on one side, Auth0's issuer and a `sub` such as `auth0|42` on the other. The same person is therefore a new principal after the move. [Session identity](session-identity.md#what-each-adapter-maps) lists what each adapter maps.

- Anything you keep per principal, such as preferences scoped by authority and subject, needs a mapping from the old principal to the new one, which your backend owns: Anchor links no accounts.
- `session.key` needs nothing: it is random and new for every session anyway.
- The context fingerprint differs too. An adapter that puts the organization or the provider session in it, as Auth0's, Clerk's and Better Auth's do, replaces a session on an organization switch or a new login where one without it, as Firebase's, keeps it.

## Tokens

- **What a profile mints changes.** Firebase's `idToken()` is an ID token; Auth0's `accessToken({ audience })` is an access token for your API's audience. Your API has to accept the new issuer's tokens before the switch. [Token profiles](token-profiles.md#the-profiles-of-each-adapter) lists each adapter's.
- **The scheme can change.** Use `token.scheme` rather than assuming `Bearer`: Auth0, OpenID Connect and Okta can answer `DPoP`, and Amplify's ID token has no scheme.
- **Cookie providers mint nothing.** Better Auth and Auth.js declare no profiles, so the types reject every `getToken` call on them; your API calls carry the session cookie instead.
- **Interaction.** Only some providers need the user before they mint. Handle `INTERACTION_REQUIRED` wherever the new adapter's page lists it.

## Observation

An adapter whose SDK emits nothing observes nothing: Auth0's, react-native-auth0's, the HTTP adapter and Auth.js in the same tab. Moving to one of them means calling `anchor.sync()` after every native call that changes the session; moving away from one makes those calls unnecessary, and harmless. Where a provider keeps tabs apart, add the [`crossTab()`](browser-lifecycle.md#across-tabs) hint.

## Endings

`session.end()` answers what the new provider can prove, and your sign-out handler should read the answer rather than assume it:

- a `navigation` page to open appears with Auth0, OpenID Connect, Keycloak and Okta, whose own session survives until the browser visits it;
- `remote` is `unknown` for several providers, and `not-applicable` for Firebase, whose client cannot revoke refresh tokens;
- signing out everywhere stays with the new SDK, through `anchor.native`.

[Ending a session](ending-a-session.md#what-each-adapter-answers) lists each adapter's answer.

## Blocked sessions

`action-required` exists only where the provider blocks a session on a step: Clerk's session tasks, and the `action` your own backend answers through the HTTP adapter. An application moving to one of them renders the step; one moving away never sees the state.

## The server side

A server that reads requests with [`@priemskiyyy/anchor-server`](server-rendering.md) swaps its server adapter the same way, such as `@priemskiyyy/anchor-firebase-node` for `@priemskiyyy/anchor-clerk-node`. Each server adapter maps a session as its client adapter does, so the principal on the page and in the browser still agree after the move.

## A checklist

1. Install the new adapter and its SDK, and create the SDK the way its page shows.
2. Give the new adapter the profile names your code already uses.
3. Make your API accept the new provider's tokens, or the session cookie.
4. Map stored per-principal data to the new principals.
5. Add or remove `anchor.sync()` calls after native sign-in and sign-out flows.
6. Handle `result.navigation` and `INTERACTION_REQUIRED` where the new provider answers them.
7. Swap the server adapter.
