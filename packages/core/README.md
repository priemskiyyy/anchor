# @priemskiyyy/anchor

Provider-independent session state for TypeScript, on the web, in React Native and on servers. The core resolves the first session state, observes your provider through an adapter, gives every security context its own random `session.key`, and binds token requests and session endings to the session they were made for, so no pending work ever lands on the next user.

No dependencies, ESM only, no side effects on import.

Version 0.1.1 is an initial preview. APIs may change before 1.0. See the [verification limits](https://github.com/priemskiyyy/anchor/blob/main/docs/verification.md) before adopting an adapter.

## Installation

```sh
pnpm add @priemskiyyy/anchor @priemskiyyy/anchor-firebase
```

## Use it

```ts
import { Anchor } from "@priemskiyyy/anchor";
import { firebase, idToken } from "@priemskiyyy/anchor-firebase";
import { getAuth } from "firebase/auth";

export const anchor = new Anchor({
  adapter: firebase({ sdk: getAuth(app), tokens: { api: idToken() } }),
});

await anchor.start();

const state = anchor.session.get();

if (state.status === "signed-in") {
  const token = await state.session.getToken("api");

  await fetch("/api/projects", {
    headers: { authorization: `${token.scheme ?? "Bearer"} ${token.value}` },
  });
}
```

## The session state

`anchor.session` is an observable value: `get()` returns the current state and `subscribe(listener)` hears every change.

| `status`          | What it means                                                                                                                                   |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `initializing`    | The first resolution has not finished. It never comes back.                                                                                     |
| `signed-out`      | The provider positively says there is no session.                                                                                               |
| `signed-in`       | `state.session` is the session.                                                                                                                 |
| `action-required` | The provider blocks the session on a step, `state.action.kind`, such as `choose-organization`. The session cannot mint tokens and can be ended. |
| `unavailable`     | The first resolution failed; `state.error` says why. It is not a logout, and the next successful read or push replaces it.                      |

A session carries its `key`, its `principal` (`authority`, `subject`, `tenant`), the `user` as frozen plain data, and its `guest` and `impersonated` flags. The key changes exactly when the security context does: another user, tenant, organization, guest upgrade or impersonation.

## Tokens

`session.getToken(profile, { signal, forceRefresh })` mints a token of a profile the adapter declares, for that session only. Callers of one profile share one request; a forced request never shares with a normal one; a caller's abort ends only its own wait. When the session is replaced or ends while the request runs, it rejects with `SESSION_CHANGED`. Anchor keeps no token once a request settles.

## Ending the session

`session.end()` ends this session in this application, never every device or the identity provider. It answers what it proved: `local` and `remote`, each `completed`, `not-applicable` or `unknown`, and a `navigation` page to open when the provider needs one to finish. Calling it on a session that was already replaced answers `not-applicable` and calls nothing.

## Lifecycle

- `start()` opens the adapter and resolves once the first state is known. It is idempotent; a start whose adapter failed to open may be tried again.
- `sync()` reads the provider again, for changes it does not report, such as a native call on an SDK that emits no events.
- `dispose()` stops observing, rejects pending work with `DISPOSED` and silences late callbacks. It never ends the session.
- `hints` are reasons to read again, such as the page becoming visible: `start()` installs them before the adapter opens and `dispose()` removes them. A hint sees only the session's status and key, and one that throws while installing fails the start with `START_FAILED`. `@priemskiyyy/anchor-browser` ships `visibility()`, `online()` and `crossTab({ name })`; `@priemskiyyy/anchor-react-native` ships `appState({ sdk: AppState })`.

## Errors

Operations reject with an `AnchorError` whose `code` you branch on: `SESSION_CHANGED`, `ACTION_REQUIRED`, `INTERACTION_REQUIRED`, `TOKEN_FAILED`, `END_FAILED`, `READ_FAILED`, `TIMEOUT`, `ABORTED`, `UNSUPPORTED`, `INVALID_ANSWER`, `START_FAILED`, `NOT_STARTED`, `DISPOSED`. Only `INVALID_CONFIGURATION` is thrown synchronously, from the constructor; the bindings throw it too for a hook outside its provider, and the devtools for a second mount or an element that cannot host a shadow root.

## Diagnostics

`anchor.diagnostics` is a passive view: a frozen snapshot of the lifecycle, the session and the calls in flight, and a timeline of events such as `session accepted` or `token discarded`. Observing it never starts Anchor or calls the provider, and it never carries a token, the user's data or a provider's error.

## Testing

`@priemskiyyy/anchor/mock` exports `createMockAdapter`, which records every call and can hold reads, tokens and endings until a test settles them. `@priemskiyyy/anchor/testing` exports `testSessionAdapter`, the conformance suite every adapter runs; it needs Vitest.

## License

MIT
