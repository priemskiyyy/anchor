---
description: "Firebase Auth sessions for Anchor's server reads: each request is read through firebase-admin by its bearer ID token or its session cookie, refusals are signed out, failures to verify are unavailable, and a session maps as the client adapter maps the same user."
---

# Firebase on the server

`@priemskiyyy/anchor-firebase-node` is a server adapter for [`@priemskiyyy/anchor-server`](../server-rendering.md). Each request is read through the firebase-admin `Auth` your server initialized, by the credential that request carries: a bearer ID token in its `Authorization` header, or else the session cookie your server set with `createSessionCookie()`. A session maps as [`@priemskiyyy/anchor-firebase`](firebase.md) maps the same user in the browser, so one user is one principal on both sides.

## Install

```sh
pnpm add @priemskiyyy/anchor @priemskiyyy/anchor-server @priemskiyyy/anchor-firebase-node firebase-admin
```

The adapter supports firebase-admin 14.

## Read a request

```ts
import { firebase } from "@priemskiyyy/anchor-firebase-node";
import { getRequestSession } from "@priemskiyyy/anchor-server";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const adapter = firebase({ sdk: getAuth(initializeApp()), checkRevoked: true });

export const handleRequest = async (request: Request) => {
  const { state, headers } = await getRequestSession(request, { adapter });

  if (state.status === "unavailable") {
    return new Response("Try again shortly.", { status: 503, headers });
  }

  return new Response(renderPage(state), { headers });
};
```

A request with an `Authorization: Bearer <ID token>` header, such as an API call carrying the token the client adapter's `idToken()` profile mints, is read by `verifyIdToken()`. Any other request is read by `verifySessionCookie()` from the cookie `cookie` names. Creating the session cookie after a sign-in, and clearing it at a sign-out, stay with your server, so a read never sets a header.

## Options

| Option         | Type                               | Default                          | What it does                                                                                                              |
| -------------- | ---------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `sdk`          | firebase-admin `Auth`              | required                         | The `getAuth(app)` your server initialized, or a tenant's `TenantAwareAuth`.                                              |
| `cookie`       | `string`                           | `__session`                      | The cookie your server keeps the session cookie in. `__session` is the one cookie Firebase Hosting forwards to functions. |
| `checkRevoked` | `boolean`                          | `false`                          | Passed to `verifySessionCookie()` and `verifyIdToken()`: asks Firebase Auth on each read whether the session still holds. |
| `user`         | `(token: DecodedIdToken) => TUser` | a snapshot of the profile claims | Maps the verified claims to the plain data a session carries.                                                             |

## Capabilities

| Capability       | Firebase on the server                                                                                          |
| ---------------- | --------------------------------------------------------------------------------------------------------------- |
| Reads            | `verifyIdToken()` for a bearer ID token, else `verifySessionCookie()` for the session cookie, once per request. |
| Response headers | None: creating and clearing the session cookie stay with your server.                                           |
| Revocation       | Only with `checkRevoked: true`, which looks the user up in Firebase Auth on each read.                          |
| Tokens           | None: a request's session has no `getToken`. Tokens and endings belong to the client's Anchor.                  |
| Runtimes         | Wherever firebase-admin runs.                                                                                   |

## How a session is mapped

As the client adapter maps the same user: the authority is `https://securetoken.google.com/<projectId>`, the issuer of the project's ID tokens, taken from the credential's `aud`, because a session cookie's own `iss` is `https://session.firebase.google.com/<projectId>`. The subject is `uid`, the tenant is `firebase.tenant` or `null`, `guest` is `firebase.sign_in_provider` being `anonymous`, the context is `null` and `impersonated` is `false`. The default user is `{ uid, email, emailVerified, displayName, photoURL, phoneNumber }` from the `email`, `email_verified`, `name`, `picture` and `phone_number` claims, with `null` for a missing one, under the names the client adapter gives the Firebase user's fields.

Where the two sides differ: the server sees the user as the credential's claims describe it when it was issued, while the client adapter sees the user as the Firebase client last loaded it. An ID token's claims are at most an hour old, but a session cookie keeps the claims of the ID token it was created from for as long as it lives, up to two weeks. So a changed display name or photo, a newly verified email, or an anonymous account linked to a provider reaches the client's user first, and the server's only with a new session cookie.

## Tokens and ending

A request's session mints nothing and ends nothing. The browser's Anchor, over [`@priemskiyyy/anchor-firebase`](firebase.md), mints ID tokens and signs out; revoking a user's refresh tokens everywhere is `revokeRefreshTokens()` on your server.

## Revocation

With `checkRevoked: false`, firebase-admin's own default, a read verifies the credential against Google's public keys, which firebase-admin caches, and asks Firebase Auth nothing. A session revoked with `revokeRefreshTokens()`, a disabled user and a deleted one then still read as signed in until the credential expires. With `checkRevoked: true`, each read also looks the user up in Firebase Auth, and those are `signed-out`.

## Behavior

- A request without a bearer ID token or the session cookie is `signed-out` without a call to Firebase.
- A credential firebase-admin refuses is `signed-out`: one that expired, one revoked, a disabled or deleted user, another tenant's user, and one that is malformed, forged or issued for another project.
- A failure to verify for any other reason is `unavailable`, with firebase-admin's error as its `cause`: a failed user lookup, a missing project id, and a failure to fetch Google's public keys. firebase-admin 14 answers that last failure with the same `auth/argument-error` code as a forged credential, in the fetch's own words, so the adapter takes an `auth/argument-error` for a refusal only when its message names the credential, as every refusal of firebase-admin's does.
- Each read holds nothing between requests, and the factory is cold: creating the adapter reads nothing on `sdk`.

## What Anchor does not normalize

Creating and clearing session cookies (`createSessionCookie()`), custom tokens, revoking refresh tokens, managing users and custom claims, and multi-tenancy administration stay with firebase-admin. The adapter only verifies the credential a request carries.

The adapter passes the server conformance suite over a fake modelled on firebase-admin 14.4.0 and over the real firebase-admin `Auth` in emulator mode, and a parity test runs both real SDKs in-process and checks that it and the client adapter answer the same principal, user and flags; credentials signed by Google were not used. See the [verification matrix](../verification.md). The [package README](https://github.com/priemskiyyy/anchor/tree/main/packages/adapters/firebase-node#readme) is the reference.
