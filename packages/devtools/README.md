# @priemskiyyy/anchor-devtools

An in-page inspector for [Anchor](../core). It shows where the Anchor stands in its lifecycle, which session it holds and in which generation, the reads, token requests and endings in flight, and a searchable timeline of every diagnostic event.

It reads `anchor.diagnostics` and nothing else. It never starts the Anchor, reads the provider, mints a token, ends a session or disposes anything, and it keeps the principal hidden until you ask to see it.

The inspector is framework independent. It carries its own small UI runtime inside its bundle and renders in a shadow root, so your application needs nothing installed for it, and neither side's styles reach the other.

Version 0.1.1 is an initial preview. APIs may change before 1.0. See the [verification limits](https://github.com/priemskiyyy/anchor/blob/main/docs/verification.md) before adopting an adapter.

## Installation

```sh
pnpm add -D @priemskiyyy/anchor-devtools
```

## Mount it

In React, inside your `AnchorProvider`:

<!-- snippet: fragment -->

```tsx
import { AnchorDevtools } from "@priemskiyyy/anchor-devtools/react";
import { AnchorProvider } from "@priemskiyyy/anchor-react";

<AnchorProvider anchor={anchor}>
  <Application />
  {import.meta.env.DEV ? <AnchorDevtools /> : null}
</AnchorProvider>;
```

The other bindings have a wrapper of their own, each reading the Anchor from its provider with `useAnchor()`:

| Binding | Import                                | Use                                                                                                        |
| ------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| React   | `@priemskiyyy/anchor-devtools/react`  | `<AnchorDevtools />`                                                                                       |
| Vue     | `@priemskiyyy/anchor-devtools/vue`    | `<AnchorDevtools v-if="isDevelopment" />`                                                                  |
| Solid   | `@priemskiyyy/anchor-devtools/solid`  | `<AnchorDevtools />`                                                                                       |
| Svelte  | `@priemskiyyy/anchor-devtools/svelte` | `const devtools = createDevtoolsAttachment();` then `<div {@attach devtools}></div>`, Svelte 5.29 or newer |

Every wrapper removes the inspector when it unmounts. The React and Solid wrappers follow a provider that is given another Anchor. The Vue and Svelte wrappers inspect the Anchor the provider held when they were set up, which is what `useAnchor()` returns there; remount them to inspect a replacement, in Svelte with `{#key anchor}`. On the server the React, Vue and Solid wrappers render only their empty host element and a Svelte attachment never runs, so nothing is observed.

Anywhere else:

```ts
import { AnchorDevtools } from "@priemskiyyy/anchor-devtools";

const devtools = new AnchorDevtools({ anchor });

devtools.mount(document.body.appendChild(document.createElement("div")));
```

The element must be one that can host a shadow root, such as a `div`. Keep it out of production builds with a condition your bundler can remove, as above. The inspector is a development tool, and nothing in Anchor depends on it.

## Options

| Option          | Default | Meaning                                                                       |
| --------------- | ------- | ----------------------------------------------------------------------------- |
| `anchor`        | -       | The Anchor to inspect. A wrapper reads it from the provider instead.          |
| `initialIsOpen` | `false` | Opens the panel on the first visit. Later visits restore the last open state. |
| `maxEvents`     | `200`   | Timeline rows kept in memory, clamped to 1 to 1000, the newest kept.          |

The inspector accepts any object with a `diagnostics` member, and its type names nothing else, so it has no way to call `start`, `sync`, `getToken`, `end` or `dispose`. The class also has `unmount()`, `setAnchor(anchor)` and `setMaxEvents(count)`. Mounting twice throws an `AnchorError` with the code `INVALID_CONFIGURATION`; unmounting twice does nothing. Recorded rows survive an unmount, so the timeline is still there when the inspector is mounted again.

## What it shows

- **Launcher**: a small pill with a status dot that follows the session: grey while `initializing`, blue when `signed-out`, green when `signed-in`, amber when `action-required` and red when `unavailable`.
- **Header**: the lifecycle (`idle`, `starting`, `started` or `disposed`), then the adapter's name, the session status, the generation and the session key. The principal (authority, subject and tenant) reads `principal hidden` until you turn on **Show values**. The panel docks to the bottom or to the right and resizes by dragging its edge or with the arrow keys.
- **Operations in flight**: each read, `active` or `queued`, with how many `sync()` callers wait for it; each token request with its profile, whether it forces a refresh, its waiters and its session; each ending with its session. Session keys are shortened here and in the timeline.
- **Timeline**: every diagnostic event, newest first, with its time, its type, its session and its context summarised as `field value` pairs. Expanding a row shows the context as JSON with a Copy button. Search matches the type, the session key and the context. The group chips narrow to Lifecycle, Reads, Session, Tokens, Ending or Callbacks, each with a live count; an `answer invalid` is filed with the call that answered, so an invalid token answer shows under Tokens. Pause stops recording and Clear empties the timeline. Neither touches the Anchor.

## What it never shows

Anchor's diagnostics never carry a token, a cookie, the user object or a provider's error, which reaches them as an error code only, and the inspector reads nothing else, so none of them can appear in the panel. The principal is the one value it can show, and only once **Show values** is on. Every string is written as text, never as markup.

The open state, the dock, the size and **Show values** are remembered in `localStorage` under `@priemskiyyy/anchor-devtools`. A stored value that does not parse is forgotten, and storage that refuses a write keeps the value for the page.

## Accessibility

The launcher and every control are native buttons or inputs with a visible focus ring. The panel is a labelled complementary landmark, the operations are a labelled region, the resize handle is a focusable separator, and the group chips state whether they are pressed. Opening moves focus into the panel and Escape closes it and returns focus to the launcher, while a panel restored from a previous visit never steals focus. Motion is removed for people who ask for less of it, and the panel follows the light or dark preference.

## Behavior

The inspector subscribes to `diagnostics` and `diagnostics.events` when it mounts and releases both when it unmounts; constructing it subscribes to nothing. Recording runs while it is mounted, also when the panel is collapsed. Pause releases the event stream and nothing else: the snapshot behind the header and the operations stays subscribed and live, because observing it creates no demand. After `anchor.dispose()` the panel keeps the last snapshot and the `anchor disposed` row.

## Tests

The tests render into a real shadow root in jsdom and query it by role, over a real Anchor on Anchor's mock adapter. They count live listeners on a spied `diagnostics` to prove that constructing the inspector subscribes to nothing and that pausing and unmounting release what it subscribed, and they check the mock's reads, token calls and endings to prove that mounting, opening, filtering, pausing and unmounting ask the provider for nothing. One test mints a token, fails a read, a token request and an ending with recognisable provider errors, and puts a cookie in the user, then asserts that none of them appears anywhere in the shadow root's markup, attributes included, with **Show values** on. Each wrapper is rendered through its own binding (React under Strict Mode). A second project renders every wrapper on a server, with no `window` and each framework's server build, and asserts the exact markup and that nothing is subscribed. Resizing is tested with the keyboard and with pointer events in jsdom. In a real browser, the Session Lab's Playwright pass mounts the React wrapper in Chromium, checks the open shadow root, the timeline and the principal hidden until **Show values**, and opens the Vue, Solid and Svelte wrappers from their examples. Hydrating the Solid wrapper's server host was not tested.

## License

[MIT](LICENSE)
