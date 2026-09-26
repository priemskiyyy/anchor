---
description: "The five session states, what evidence each needs, how anchor.session is observed, and the start, sync and dispose lifecycle around them."
---

# Session state

`anchor.session` is the one root snapshot of the session. It is an observable value: `get()` answers the current state synchronously, and `subscribe(listener)` hears every change after it subscribed.

```ts
import type { SessionState } from "@priemskiyyy/anchor";

const describeSession = <TUser, TProfile extends string>(
  state: SessionState<TUser, TProfile>,
) => {
  if (state.status === "initializing") {
    return "Restoring your session";
  }

  if (state.status === "unavailable") {
    return `The sign-in service cannot be reached (${state.error.code})`;
  }

  if (state.status === "signed-out") {
    return "Signed out";
  }

  if (state.status === "action-required") {
    return `One more step: ${state.action.kind}`;
  }

  return `Signed in as ${state.session.principal.subject}`;
};

const stop = anchor.session.subscribe(() => {
  console.log(describeSession(anchor.session.get()));
});
```

## The five states

| `status`          | Carries                       | What it means                                                                                                         |
| ----------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `initializing`    | nothing                       | The first resolution has not finished.                                                                                |
| `signed-out`      | nothing                       | The provider positively says there is no session, or this application's `end()` completed locally.                    |
| `signed-in`       | `session`                     | The session, with its key, principal and user.                                                                        |
| `action-required` | `session`, `action: { kind }` | The provider blocks the session until the user finishes a step, such as Clerk's `choose-organization` or `setup-mfa`. |
| `unavailable`     | `error`, an `AnchorError`     | The first resolution failed. It is not a sign-out.                                                                    |

**`initializing` is the first resolution only.** A later read never returns the state to it, so background work never flickers a signed-in application through `initializing`. An adapter's first read waits for its SDK to restore a stored session (`authStateReady()`, `getSession()`, Clerk's `loaded`), so a slow restore is `initializing`, never `signed-out`.

**`signed-out` needs positive evidence**: an adapter's answer that the provider holds no session, or an `end()` of this application whose local step completed. A failed read is never a sign-out.

**`action-required` is a session the provider holds but blocks.** `action.kind` is the provider's own name for the step. The session cannot mint tokens (`getToken` rejects with `ACTION_REQUIRED`) and can be ended. A change between `action-required` and `signed-in` alone keeps the session's key; finishing a step that also changes the security context, such as choosing an organization, gives a new one.

**`unavailable` means the first resolution failed**: the read threw (`READ_FAILED`), took longer than the timeout (`TIMEOUT`) or answered outside the contract (`INVALID_ANSWER`). The next successful read or push replaces it, so a retry is `anchor.sync()`. After the first resolution, a failed read leaves the state as it was and rejects the `sync()` that asked for it.

## Observing it

- `get()` answers a frozen snapshot, referentially stable until something in it changes. The session's `user` is a frozen copy of the plain data the adapter produced.
- `subscribe(listener)` never calls the listener at once and returns the function that removes it. A listener that throws is isolated: the others still run, and its error is rethrown in a microtask, where your error reporting sees it.
- A notification pass stops as soon as a newer value lands, so no listener sees an older state after a newer one. A listener may call `sync()`, `getToken()` or `end()` while it is notified.
- A change that leaves the state structurally equal publishes nothing: a token refresh with the same user re-renders nothing.
- Observing never starts Anchor, reads the provider or mints a token. The framework bindings are built on this.

## The lifecycle

| Member      | What it does                                                                                                                                                |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `start()`   | Opens the adapter and resolves once the first state is known. Concurrent and later calls share one promise; after `START_FAILED`, a later call tries again. |
| `sync()`    | Reads the provider again, for changes it does not report. Rejects `NOT_STARTED` before `start()` and `DISPOSED` after `dispose()`.                          |
| `dispose()` | Stops observing, rejects every pending operation with `DISPOSED` and silences late callbacks. Synchronous and idempotent.                                   |
| `native`    | The SDK you passed to the adapter, typed as your own, available before `start()`.                                                                           |

Members are arrow fields, so a destructured `sync` stays bound.

### start

`start()` installs the [hints](browser-lifecycle.md), calls the adapter's `open` synchronously and starts the first read at once. It resolves when the state first leaves `initializing`: through a push, a read, or a failed read that commits `unavailable`. An adapter may push from inside `open`, as Clerk's does, and that push may resolve the start before the first read lands.

### sync

`sync()` reconciles Anchor with what the provider holds by reading it. It forces no token refresh, reloads no profile and validates nothing remotely. At most one read runs and at most one waits: a `sync()` while a read runs joins the waiting one, because the running read may have started before the change the caller wants to see. It resolves when a read that started after the call settles, or when a newer push already superseded it, and rejects with the read's error (`READ_FAILED`, `TIMEOUT`, `INVALID_ANSWER`) otherwise.

Call it after a native call on an SDK that emits nothing, such as a login through auth0-spa-js, and for a retry or pull to refresh:

```ts
const handleRetryPress = () => {
  anchor.sync().catch((error: unknown) => {
    console.warn("The session could not be read", error);
  });
};
```

### dispose

`dispose()` is synchronous and idempotent. It silences the adapter's observer, aborts every adapter signal, rejects every pending start, read, token request and ending with `DISPOSED`, and disposes the adapter's session, so its listeners on your SDK are removed. It never ends the session and never touches the SDK otherwise. `anchor.session` keeps its last value, and every later operation rejects with `DISPOSED`.

## Next

[Session identity and `session.key`](session-identity.md) says when a session is replaced. [Errors](errors.md) lists every code.
