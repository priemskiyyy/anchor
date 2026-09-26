---
description: "The races Anchor handles and how: the commit rule that orders pushes and reads, the eight invariants that keep work inside its session, each with the test that holds it, and what Anchor cannot promise."
---

# Race conditions and guarantees

Everything in Anchor serves one invariant:

> Work accepted for one session belongs to that session. When the session is replaced or ended, the work loses the right to affect the application.

A provider SDK reports changes in its own order, on its own schedule. A read started before a sign-in can land after it; a token requested for one user can resolve after another signed in; a callback can fire after its listener was removed. Anchor orders what it hears, binds every operation to the session it was asked of, and checks again when the answer arrives.

## The commit rule

Every push from the adapter and every read Anchor starts takes a revision from one counter: a push when it arrives, a read when it starts. A read's answer commits only when:

1. Anchor is not disposed,
2. the start that began the read is still the current one,
3. the read is still the active read, and
4. no observation with a newer revision has committed.

A push commits at once: it is the newest observation when it arrives. A read that a push superseded is discarded when it lands and recorded as `read superseded`. Committing compares the new security context with the current session's: the same context keeps the key, another one replaces the session, closes its record and rejects its pending work with `SESSION_CHANGED`. Every adapter call goes through a promise, so a synchronous answer settles in the same order as an asynchronous one.

## The invariants

Each is a named test in `packages/core/src/utils/races.test.ts`, over a real Anchor and the core's mock adapter.

| Invariant                                                                                                                              | Test          |
| -------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| A first read that lands after a newer push cannot restore the older session.                                                           | `invariant 1` |
| A token requested for A that lands after B was accepted rejects with `SESSION_CHANGED`.                                                | `invariant 2` |
| A token asked for A after the SDK switched to B, before Anchor saw the switch, is refused by the adapter, because the request names A. | `invariant 3` |
| The same subject in a new organization, tenant, guest or impersonation context gets a new key, and its pending token rejects.          | `invariant 4` |
| Callbacks from a start that failed, and from before a dispose, change nothing.                                                         | `invariant 5` |
| Reentrant pushes order by revision, the newest wins, and no subscriber sees an older state after a newer one.                          | `invariant 6` |
| An `end()` for A that lands after B was accepted changes nothing for B, and its signal aborted.                                        | `invariant 7` |
| A stale reference to A's session can neither mint nor end anything for B.                                                              | `invariant 8` |
| Ignoring a stale answer undoes nothing the provider's SDK stored itself; each adapter's README states the order its SDK stores in.     | `invariant 9` |

Invariant 3 is the adapter's half of the contract: every token and end request carries the session's identity, and each adapter refuses to act for anyone else. `testSessionAdapter`, the conformance suite every adapter runs, checks that an adapter refuses to mint for a session its SDK no longer holds.

## Beyond the invariants

- **Twenty-five scenarios** from the specification run as named tests in `packages/core/src/utils/scenarios.test.ts`, `scenario 1` to `scenario 25`.
- **A property sweep** in `packages/core/src/utils/interleavings.test.ts` runs 300 seeded interleavings of pushes, silent changes, invalidations, syncs, reads, tokens, ends and disposal, and checks every time that a superseded read changes nothing, a key belongs to one identity, a token resolves only for the current signed-in session, a sync waits for a later read, the state never returns to `initializing` or changes after dispose, and the state converges on what the provider holds.
- **Mutation testing** in `scripts/mutate.mjs` breaks sixteen rules on purpose, from the commit rule to an adapter that ends another user's session, and requires a test to fail for each.

## The principles behind them

1. Anchor normalizes session lifecycle, not authentication protocols.
2. An adapter translates one provider SDK onto the contract and nothing more. The core never branches on an adapter's name.
3. The application owns its SDK. It initializes, configures and signs in with it; Anchor only observes and calls it.
4. A session operation belongs to the session it was called on and can never complete for another.
5. Constructing an Anchor does nothing. Observing it creates no demand.
6. Snapshots are synchronous, frozen and stable until they change.
7. Signed out needs positive evidence. A failure to read is never a sign-out.
8. Anchor never throws into its host at runtime. Only misconfiguration throws; operations reject.

## What Anchor cannot promise

- **A provider's own late writes.** Ignoring a stale result does not undo a provider SDK's own late storage mutation. Each adapter's page notes the orderings of its SDK that matter, such as Amplify dispatching `signedOut` before its storage is cleared, or okta-auth-js signing a session out before a failed renewal rejects.
- **A provider that hides its own failures.** Anchor can only report the evidence a provider gives. next-auth's session route answers an empty session, with a 200, when a callback throws or its database fails, so the Auth.js adapter reads that failure as `signed-out`; its page says so.
- **An SDK that cannot target a session.** Where the SDK's sign-out takes no user, as Amplify's does, a sign-in that lands between the adapter's check and the sign-out is signed out too. The adapter's page says so where it applies.
- **Refresh, persistence and remote revocation.** The conformance suite cannot prove them against a provider, so each adapter tests them itself against its SDK; the [verification matrix](verification.md) says against what.

The [runtime architecture](internals/architecture.md) describes the owners that keep these rules and maps every release gate to its tests.
