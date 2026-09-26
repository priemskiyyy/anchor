---
description: "Anchor's security model: what it never does with tokens, cookies and provider errors, how a stale result is kept from crossing sessions, what diagnostics, devtools, cross-tab messages and hydration may carry, and what stays with your provider and backend."
---

# Security model

Anchor sits between a provider SDK and the rest of the application, so it holds, for a moment, what an attacker would want: tokens, the user and the provider's errors. The rules below keep that moment short and keep each result inside its session.

## Tokens and credentials

- Anchor never logs, stores, broadcasts, serializes or diagnoses a token, a cookie or a refresh token. It keeps no token once a request settles; caching is the provider SDK's.
- Anchor never decodes a token to make a decision, and never assumes a token is a JWT or a bearer credential. `token.scheme` is whatever the provider names.
- Anchor never attaches credentials to a request. Your client does, with a token it asked of the session.
- The core stores nothing. Secure storage and restoring a session after a restart are the provider SDK's; the devtools keep only their own panel settings in `localStorage`.

## Sessions

- A stale result never crosses a session generation: a token requested for one session never resolves once another is accepted, and an ending started for one session never signs out another. See [race conditions and guarantees](race-conditions.md).
- Every token and end request names its session, and each adapter refuses to act for any other: its SDK may hold a new user before Anchor has heard of the change.
- Any change of the security context, another user, tenant, organization, provider session, guest upgrade or impersonation, is a new session with a new key. A cache or a connection scoped by `session.key` therefore never serves one context's data to another.
- Anchor never falls back from one authority to another, and never takes a failure for a sign-out. A provider that cannot tell makes the first state `unavailable`.
- `session.end()` ends this session only. It never signs out every device or ends the identity provider's session behind your back, and it says what it could not prove.
- `session.key` is an identifier, not a secret: it is random, never derived from the user, and appears in diagnostics.

## Diagnostics and the devtools

- Diagnostics carry the lifecycle, statuses, session keys, the principal, profile names, error codes and counts. They never carry a token, a cookie, the user's data or a provider's error, which reaches them as a code only.
- The devtools read `anchor.diagnostics` and nothing else, so none of those can appear in the panel. The principal, the one value the panel can show, stays hidden until the viewer turns on **Show values**, and every string is written as text, never as markup.
- A test mints a token, fails a read, a token request and an ending with recognisable provider errors, puts a cookie in the user, and asserts that none of them appears anywhere in the panel's markup, with values shown.

## Across tabs and to the page

- The `crossTab()` hint posts the string `invalidate` and nothing else: no token, no key, no user and no state. A tab never takes another tab's word for who is signed in; it asks its own provider.
- A server's hydration goes through an explicit allowlist: the status, a required action's `kind` and exactly what your `select` picks. It never carries a token, a cookie, SDK state or a provider error, and the client's Anchor never takes it for evidence of who is signed in.

## The supply chain

Adapters never import their provider at runtime. Each takes the SDK your application installed and initialized, typed structurally, so installing an adapter adds no second copy of an SDK, and the core has no runtime dependencies at all.

## What stays with you

Anchor does not authorize requests, verify JWTs, or store or rotate refresh tokens. Your backend verifies every token it receives and decides what the user may do, and your provider SDK stores and refreshes the credentials.
