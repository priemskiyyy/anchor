---
description: "Every AnchorError code, when it is thrown and when it rejects, what carries the provider's error as its cause, and which codes an adapter's own error keeps."
---

# Errors

Anchor never throws into its host at runtime. Only misconfiguration throws; every operation rejects, and every adapter call and listener is contained, so a provider's failure becomes a rejection, a state or a diagnostic. What goes wrong is an `AnchorError` whose `code` you branch on, with the provider's own error, when there is one, as its `cause`.

```ts
import { AnchorError } from "@priemskiyyy/anchor";

const endSession = async () => {
  try {
    return await session.end();
  } catch (error) {
    if (error instanceof AnchorError && error.code === "END_FAILED") {
      console.warn("The provider refused to sign out", error.cause);

      return null;
    }

    throw error;
  }
};
```

## What throws

Three misconfigurations throw an `AnchorError` with the code `INVALID_CONFIGURATION` synchronously:

- the `Anchor` constructor, for a `timeout` that is not a whole number of milliseconds from 1 to 2147483647;
- a binding hook, composable, primitive or utility called outside its provider;
- mounting the devtools twice or on an element that cannot host a shadow root.

Adapter factories are cold and throw nothing: an SDK an adapter cannot work with, such as a Firebase app without a `projectId`, fails `start()` with `START_FAILED`.

A token profile the adapter does not declare is also `INVALID_CONFIGURATION`, as a rejection of `getToken`, and the types refuse it first.

## The codes

| Code                    | When                                                                                                                                         |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `INVALID_CONFIGURATION` | A misconfiguration, listed above.                                                                                                            |
| `NOT_STARTED`           | `sync()` before `start()`.                                                                                                                   |
| `DISPOSED`              | Any operation after `dispose()`, and every operation pending when it happens.                                                                |
| `START_FAILED`          | The adapter's `open` threw, or a hint threw while it installed. `start()` may be called again.                                               |
| `READ_FAILED`           | A read threw. The error of an `unavailable` first state, and the rejection of `sync()`.                                                      |
| `TIMEOUT`               | An adapter call outlived the `timeout`.                                                                                                      |
| `INVALID_ANSWER`        | An adapter answered outside the contract, such as a session without a string `subject`.                                                      |
| `SESSION_CHANGED`       | The session an operation belongs to was replaced, ended or is ending. Also what an adapter throws when its SDK now holds another identity.   |
| `ACTION_REQUIRED`       | A token for a session in `action-required`.                                                                                                  |
| `UNSUPPORTED`           | The adapter cannot do this: it has no `getToken` or no `end`, or its SDK cannot honor a `forceRefresh`.                                      |
| `INTERACTION_REQUIRED`  | The provider needs the user before it mints a token, such as a login or consent it requires.                                                 |
| `TOKEN_FAILED`          | Token acquisition failed for any other reason.                                                                                               |
| `END_FAILED`            | The adapter's `end` threw. The session becomes usable again.                                                                                 |
| `ABORTED`               | The caller's signal aborted its wait. It carries no cause: React Native's `AbortSignal` has no reason, so Anchor reads none on any platform. |

## What an adapter's error becomes

An error an adapter throws keeps its code when it is an `AnchorError` with `SESSION_CHANGED`, `UNSUPPORTED`, `INTERACTION_REQUIRED` or `INVALID_CONFIGURATION`. Anything else becomes the operation's failure code, `READ_FAILED`, `TOKEN_FAILED` or `END_FAILED`, with the thrown value as its `cause`. So `error.cause` is where the provider's own error is, for logging and for the few cases your application handles itself.

Diagnostics carry codes, never causes: a provider's error can quote configuration or a credential, so it never reaches `anchor.diagnostics` or the devtools.

## Recovering

- **`unavailable`** at the start is not a sign-out. Show that the provider cannot be reached and retry with `anchor.sync()`; the next successful read or push replaces the state.
- **`SESSION_CHANGED`** means the work belonged to a session that is gone. Drop it: the current session's own work starts under its own key.
- **`INTERACTION_REQUIRED`** is yours to act on: call the SDK's own login or consent flow through `anchor.native`, such as `loginWithRedirect` or `acquireTokenPopup`.
- **`START_FAILED`** leaves the Anchor idle: fix what the cause names and call `start()` again.
