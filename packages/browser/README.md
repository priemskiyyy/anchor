# @priemskiyyy/anchor-browser

Browser lifecycle hints for Anchor: read the session again when the page becomes visible, when the browser comes back online, or when another tab's session changes. A hint is only a reason to read. It never proves that a session is valid, never refreshes a token, and never tells one tab who is signed in in another: the read that follows asks the provider.

## Installation

```sh
pnpm add @priemskiyyy/anchor @priemskiyyy/anchor-browser
```

## Use it

```ts
import { Anchor } from "@priemskiyyy/anchor";
import { crossTab, online, visibility } from "@priemskiyyy/anchor-browser";

export const anchor = new Anchor({
  adapter,
  hints: [visibility(), online(), crossTab({ name: "dashboard" })],
});
```

`start()` installs the hints and `dispose()` removes them. Constructing the Anchor installs nothing.

## The hints

| Hint                 | Reads again when                                        | Installs                                    |
| -------------------- | ------------------------------------------------------- | ------------------------------------------- |
| `visibility()`       | the document becomes visible                            | a `visibilitychange` listener on `document` |
| `online()`           | the browser comes back online                           | an `online` listener on `window`            |
| `crossTab({ name })` | another tab of the same `name` says its session changed | a `BroadcastChannel` named `anchor:<name>`  |

Every read goes through Anchor's own read path, so a burst of hints costs one read and one queued read at most, and a read that fails is recorded in `anchor.diagnostics` instead of reaching the hint.

## Across tabs

`crossTab({ name })` posts one message after this tab's session changes status or key, such as a sign-out or a switch of account, and reads again when another tab posts one. The first resolution of a tab posts nothing, because the other tabs read the same provider, and a user update that keeps the key posts nothing either.

The message is the string `invalidate` and nothing else: no token, no key, no user and no state. A tab therefore never takes another tab's word for who is signed in; it asks its own provider. Give each application on an origin its own `name`, so two of them never wake each other.

Use it for providers that keep tabs apart, such as auth0-spa-js with its memory cache or a cookie session behind the `http` adapter. Firebase, Supabase and Better Auth already tell their own tabs.

## Behavior

- Outside a browser, `visibility()` and `online()` install nothing, and `crossTab()` installs nothing where there is no `BroadcastChannel`, so the same Anchor runs on a server and in tests.
- Hiding the page, going offline and this tab's own messages read nothing.
- Removing `crossTab()` unsubscribes from the session and closes its channel.

## Tests

The hints run in jsdom against a real Anchor over the core's mock adapter. `crossTab()` runs against an in-process fake modelled on the HTML `BroadcastChannel` and once against Node's real one.

## License

MIT
