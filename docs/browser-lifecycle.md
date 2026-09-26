---
description: "Read the session again when the page becomes visible, when the browser comes back online, or when another tab's session changes, with hints that carry no token and prove nothing, and write a hint of your own."
---

# Browser lifecycle

A provider SDK tells its adapter about the changes it knows of. Some changes it cannot see: a session ended while the laptop slept, a sign-out in another tab of an SDK that keeps tabs apart, a network that came back. `@priemskiyyy/anchor-browser` ships three hints that read the session again at those moments.

```sh
pnpm add @priemskiyyy/anchor @priemskiyyy/anchor-browser
```

```ts
import { Anchor } from "@priemskiyyy/anchor";
import { crossTab, online, visibility } from "@priemskiyyy/anchor-browser";

export const browserAnchor = new Anchor({
  adapter,
  hints: [visibility(), online(), crossTab({ name: "dashboard" })],
});
```

`start()` installs the hints before the adapter opens, and `dispose()` removes them. Constructing the Anchor installs nothing.

## The hints

| Hint                 | Reads again when                                        | Installs                                    |
| -------------------- | ------------------------------------------------------- | ------------------------------------------- |
| `visibility()`       | the document becomes visible                            | a `visibilitychange` listener on `document` |
| `online()`           | the browser comes back online                           | an `online` listener on `window`            |
| `crossTab({ name })` | another tab of the same `name` says its session changed | a `BroadcastChannel` named `anchor:<name>`  |

A hint is only a reason to read. It never proves that a session is valid, never refreshes a token, and never tells one tab who is signed in in another: the read that follows asks the provider. Every read goes through Anchor's own read path, so a burst of hints costs one read and one queued read at most, and a read that fails is recorded in `anchor.diagnostics` instead of reaching the hint.

Hiding the page, going offline and a tab's own messages read nothing. Outside a browser, `visibility()` and `online()` install nothing, and `crossTab()` installs nothing where there is no `BroadcastChannel`, so the same Anchor runs on a server and in tests.

## Across tabs

`crossTab({ name })` posts one message after this tab's session changes status or key, such as a sign-out or a switch of account, and reads again when another tab posts one. The first resolution of a tab posts nothing, because the other tabs read the same provider, and a user update that keeps the key posts nothing either.

The message is the string `invalidate` and nothing else: no token, no key, no user and no state. A tab therefore never takes another tab's word for who is signed in; it asks its own provider. Give each application on an origin its own `name`, so two of them never wake each other.

Use it for providers that keep tabs apart, such as auth0-spa-js with its memory cache or a cookie session behind the `http` adapter. Firebase, Supabase and Better Auth already tell their own tabs. MSAL with a `localStorage` cache broadcasts an active account change to the other tabs, and next-auth broadcasts its session changes, which the Auth.js adapter hears.

## Write a hint of your own

A hint is a function that `start()` calls with a target and that answers its own removal:

```ts
import type { SyncHint } from "@priemskiyyy/anchor";

export const focus =
  (): SyncHint =>
  ({ sync }) => {
    window.addEventListener("focus", sync);

    return () => window.removeEventListener("focus", sync);
  };
```

The target is `{ sync, session }`. `sync()` asks for a read through the same path as an adapter's invalidation and never throws: a hint cannot act on a failed read, and diagnostics record it. `session` is an observable of the session's `status` and `key` only, never the user, a token or an operation, notified after every committed change. A hint that throws while it installs fails the start with `START_FAILED`, removing the hints installed before it; a removal that throws is contained: the other removals still run, and its error is rethrown in a microtask, where your error reporting sees it.

There is no background refresh scheduler. The provider SDK refreshes its own tokens, and on React Native the [foreground hint](react-native.md#read-again-in-the-foreground) reads when the app returns.
