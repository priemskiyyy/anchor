---
description: "How the Anchor core is put together: its owners, the path an observation takes to become the session state, how session-bound work is kept inside its session, and the test that guards each release gate and invariant."
---

# Runtime architecture

Anchor guarantees one thing above all: work accepted for one session belongs to that session, and once the session is replaced or ended the work can no longer affect the application. This page describes the parts that keep that guarantee and names the test that guards each rule. Test files live in `packages/core/src` unless another path is named.

## Owners

Every piece of state has one owner. Only `Anchor`, `AnchorError`, `createMockAdapter` and `testSessionAdapter` are exported.

| Owner                                                | Responsibility                                                                                                                                                          |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Anchor`                                             | The facade. Reads the options once, owns the lifecycle (idle, started, disposed), the session store and the diagnostics, and creates one runtime per start.             |
| `SessionRuntime`                                     | One start: the observer handed to the adapter, the revision counter, the running and the queued read, the commit rule, and the current session record.                  |
| `SessionRecord`                                      | One accepted session generation: its key, its identity, its token requests and its running end. Closing it rejects all of its work at once.                             |
| `TokenRequest`                                       | One shared token acquisition: its waiters, each waiter's abort, the adapter's signal and the timeout.                                                                   |
| `ValueStore`                                         | The session snapshot. A notification pass stops as soon as a newer value lands, so no subscriber sees an older state after a newer one.                                 |
| `Diagnostics`                                        | The lazy snapshot and the payload-free timeline, assembled only while someone listens.                                                                                  |
| `parseSessionAnswer`, `parseToken`, `parseEndResult` | The contract checks at the adapter boundary: an answer outside the contract is refused as `INVALID_ANSWER`, and what is kept is a frozen copy of the known fields only. |
| `createMockAdapter`, `testSessionAdapter`            | The test double, well behaved by default and able to hold every call, and the contract every adapter keeps.                                                             |

## The path of an observation

Every push from the adapter and every read the core starts takes a revision from one counter: a push when it arrives, a read when it starts. The runtime remembers the revision of the last committed observation.

1. A push is the newest observation when it arrives, so it commits at once. A push that arrives while the adapter's `open` is still running is held until `open` returns, so an `open` that pushes and then throws commits nothing.
2. A read runs at most one at a time. A `sync()` or an `invalidate()` while one runs queues one more read, which starts when the running one settles, because the running one may have read before the change the caller wants to see. Every waiting `sync()` shares the queued read.
3. A read's answer commits only when the runtime is still open, the read is still the current one, and no newer observation committed since it started. Otherwise it is discarded as `read superseded`, and the callers waiting on it resolve, because the state is already newer than what they asked for.
4. A failed read changes the state only while it is `initializing`, to `unavailable`. After the first resolution a failed read rejects the callers of `sync()` and leaves the session alone.
5. Committing compares the security context of the answer (authority, tenant, subject, the adapter's `context`, `guest` and `impersonated`) with the current record's. The same context keeps the record, its key and its generation, and publishes a new state only when the status, the action or the user changed structurally. Another context closes the current record with `SESSION_CHANGED`, opens a new one with a random key, and publishes.

## Sessions and their work

`session.getToken()` and `session.end()` are the record's own functions, so a reference to a session can only ever act for that session.

- A token request is shared by every caller of the same profile and `forceRefresh`. It is refused before the adapter is called when the record is closed or ending, when the state blocks the session in `action-required`, when the profile is undeclared, when the adapter cannot mint, or when the caller's signal is already aborted. It is checked again when the adapter answers, because the session may have changed while it ran.
- The adapter receives the session's identity with every token and end request, and the contract makes it refuse to act for anyone else. This closes the window in which the SDK already holds another user and Anchor has not seen the change yet.
- Closing a record rejects every waiter at once and aborts every adapter signal. A late answer finds nobody.
- An end makes its record ending: pending tokens reject, new ones are refused. An answer whose local step completed commits `signed-out` as the newest observation, because the adapter's answer is the evidence. Any other answer, or a failure, reopens the record and reads to reconcile. An answer that lands after the record was replaced resolves its caller and changes nothing.

## Principles

1. Anchor normalizes session lifecycle, not authentication protocols.
2. An adapter translates one provider SDK onto the contract and nothing more. The core never branches on an adapter's name.
3. The application owns its SDK. It initializes, configures and signs in with it; Anchor only observes and calls it.
4. A session operation belongs to the session it was called on and can never complete for another.
5. Constructing an Anchor does nothing. Observing it creates no demand.
6. Snapshots are synchronous, frozen and stable until they change.
7. Signed out needs positive evidence. A failure to read is never a logout.
8. Anchor never throws into its host at runtime. Only misconfiguration throws; operations reject.

## The adapter contract

An adapter is a plain `{ name, native, tokens, open }`. `open(observer)` installs the provider's listeners synchronously and returns `{ read, getToken?, end?, dispose? }`. The observer's `session(answer)` pushes a complete answer and `invalidate()` asks for a read. The rules each adapter keeps are in `CONTRIBUTING.md`; `testSessionAdapter` holds every adapter to them through a real Anchor.

## Release gates and their tests

| Gate                                                                                             | Test                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Every race invariant                                                                             | `utils/races.test.ts`, one test per invariant, named `invariant 1` to `invariant 9`                                                                                                                                                                                                                                                                                                                                                 |
| The specification's twenty-five scenarios                                                        | `utils/scenarios.test.ts`, named `scenario 1` to `scenario 25`                                                                                                                                                                                                                                                                                                                                                                      |
| Conformance for every adapter                                                                    | `testing/conformance.test.ts` (the mock, pushing and silent), `testing/customAdapter.test.ts` (an adapter built from public exports), and each adapter's `conformance.test.ts`; for server adapters, `packages/server/src/testing/conformance.test.ts` (the fake server) and `packages/adapters/better-auth-node/src/conformance.test.ts` (a real Better Auth server), both through `testServerSessionAdapter`                      |
| Diagnostics carry no token, cookie, user data or provider error                                  | `utils/diagnostics.test.ts`: "no event or snapshot carries a token value, the user's data or a provider's error"; `packages/devtools/src/AnchorDevtools.test.ts`: "no token, cookie or provider error appears anywhere in the panel, even with values shown"                                                                                                                                                                        |
| Observation creates no provider demand                                                           | `utils/diagnostics.test.ts`: "observing diagnostics starts nothing and asks the adapter for nothing"; `utils/Anchor.test.ts`: "constructing an Anchor opens nothing, reads nothing and reads initializing"; `packages/devtools/src/AnchorDevtools.test.ts`: "observing creates no provider demand: mounting, opening, filtering, pausing and unmounting read, mint and end nothing"                                                 |
| Bindings never start, read, mint or end during render, and a remount starts and disposes nothing | `packages/react/src/hooks/hooks.test.tsx`: "mounting the provider and every hook starts, reads and mints nothing, and unmounting disposes nothing and leaves no listener" and "in Strict Mode the double mount starts and disposes nothing, and the unmount leaves no listener"; the same two in `packages/vue`, `packages/solid` and `packages/svelte`, with a remount in place of Strict Mode                                     |
| The commit rule holds under any interleaving                                                     | `utils/interleavings.test.ts`: a fast-check sweep of pushes, silent changes, invalidations, syncs, reads, tokens, ends and disposal, checking that a superseded read changes nothing, a key belongs to one identity, a token resolves only for the current signed-in session, a sync waits for a later read, the state never returns to `initializing` or changes after dispose, and the state converges on what the provider holds |
| The public API types as a consumer sees it                                                       | `tests/types/public-api.ts` against the built package, and `utils/Anchor.contracts.ts`                                                                                                                                                                                                                                                                                                                                              |

## Invariants and their tests

| Invariant                                                                         | Test                                                                                                                         |
| --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| A session key is a random UUID and never reused                                   | `utils/identity.test.ts`: "a session's key is a random UUID", "signing out and in again in the same context gives a new key" |
| Any change of the security context is a replacement                               | `utils/identity.test.ts`: "a change of the %s replaces the session with a new key"                                           |
| The same context keeps its key and publishes only structural changes              | `utils/identity.test.ts`: "the same security context keeps its key while the user's data changes"                            |
| A push inside `open` waits for `open`, and a failed `open` commits nothing        | `utils/lifecycle.test.ts`: "a push from inside open waits for open to return"                                                |
| `sync()` coalesces and never flips the session on failure                         | `utils/lifecycle.test.ts`: the `sync` tests                                                                                  |
| Tokens are shared per profile and refresh mode, and one caller's abort is its own | `utils/internal/sessions/SessionRecord.test.ts`, `utils/internal/sessions/TokenRequest.test.ts`                              |
| An end that completed locally is the evidence of signing out                      | `utils/end.test.ts`                                                                                                          |
| A listener, an adapter call or a malformed answer never throws into the host      | `utils/containment.test.ts`                                                                                                  |
| An answer outside the contract is refused, and only known fields are kept         | `utils/internal/answers/*.test.ts`                                                                                           |
