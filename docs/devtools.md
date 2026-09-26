---
description: "Read anchor.diagnostics, a passive snapshot and event timeline, and mount the Anchor devtools to see the lifecycle, the session's key and generation, the work in flight and every event, with the principal hidden until you ask."
---

# Diagnostics and devtools

`anchor.diagnostics` is a passive view of an Anchor: a frozen snapshot of its lifecycle, its session and the calls in flight, and a timeline of events such as `session accepted` or `token discarded`. The devtools are an in-page inspector built on it. Observing either never starts the Anchor, reads the provider, mints a token or ends a session.

## The snapshot

```ts
const snapshot = anchor.diagnostics.get();

console.log(
  snapshot.state,
  snapshot.session.status,
  snapshot.session.generation,
);

const stop = anchor.diagnostics.subscribe(() => {
  console.log(anchor.diagnostics.get().operations);
});
```

| Field        | What it holds                                                                                                                                                                                                  |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `state`      | The lifecycle: `idle`, `starting`, `started` or `disposed`.                                                                                                                                                    |
| `adapter`    | `{ name }` of the adapter.                                                                                                                                                                                     |
| `session`    | `{ status, key, principal, generation }`: the key and principal are `null` without a session, and the generation goes up with every replacement of the session within one start, a sign-out included.          |
| `operations` | The work in flight: each read with whether it is queued and how many `sync()` callers wait for it, each token request with its session, profile, `forceRefresh` and waiters, and each ending with its session. |

The snapshot is computed on the first `get()` after a change, and change notifications are batched in a microtask.

## The timeline

```ts
const stopEvents = anchor.diagnostics.events.subscribe((event) => {
  console.debug(event.type, event.session?.key ?? "no session", event.context);
});
```

Each event is `{ type, session, timestamp, context }`: `session` is `{ key }` or `null`, `timestamp` is epoch milliseconds, and `context` is frozen plain detail, such as statuses, profile names, error codes and counts. The types are a closed list of phrases:

| Group     | Types                                                                                   |
| --------- | --------------------------------------------------------------------------------------- |
| Lifecycle | `anchor started`, `anchor start failed`, `anchor disposed`                              |
| Reads     | `read started`, `read completed`, `read failed`, `read superseded`, `answer invalid`    |
| Session   | `session accepted`, `session updated`, `session signed out`, `session unavailable`      |
| Tokens    | `token requested`, `token joined`, `token received`, `token failed`, `token discarded`  |
| Ending    | `end started`, `end completed`, `end failed`                                            |
| Callbacks | `callback ignored`: a late callback from a start that failed or from before `dispose()` |

Events are assembled only while an events listener is subscribed; with none, recording costs a check. Diagnostics carry the principal, because debugging needs it, but never a token, a cookie, the user's data or a provider's error, which reaches them as a code only.

## The devtools

```sh
pnpm add -D @priemskiyyy/anchor-devtools
```

In React, inside your `AnchorProvider`:

```tsx
import { AnchorDevtools } from "@priemskiyyy/anchor-devtools/react";
import { AnchorProvider } from "@priemskiyyy/anchor-react";

export const Root = () => (
  <AnchorProvider anchor={anchor}>
    <Application />
    {import.meta.env.DEV ? <AnchorDevtools /> : null}
  </AnchorProvider>
);
```

| Binding | Import                                | Use                                                                                                        |
| ------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| React   | `@priemskiyyy/anchor-devtools/react`  | `<AnchorDevtools />`                                                                                       |
| Vue     | `@priemskiyyy/anchor-devtools/vue`    | `<AnchorDevtools v-if="isDevelopment" />`                                                                  |
| Solid   | `@priemskiyyy/anchor-devtools/solid`  | `<AnchorDevtools />`                                                                                       |
| Svelte  | `@priemskiyyy/anchor-devtools/svelte` | `const devtools = createDevtoolsAttachment();` then `<div {@attach devtools}></div>`, Svelte 5.29 or newer |

Every wrapper reads the Anchor from its provider with `useAnchor()` and removes the inspector when it unmounts. The React and Solid wrappers follow a provider that is given another Anchor; the Vue and Svelte wrappers inspect the Anchor the provider held when they were set up, so remount them to inspect a replacement, in Svelte with `{#key anchor}`. On the server the React, Vue and Solid wrappers render only their empty host element and a Svelte attachment never runs, so nothing is observed.

Anywhere else:

```ts
import { AnchorDevtools } from "@priemskiyyy/anchor-devtools";

const devtools = new AnchorDevtools({ anchor });

devtools.mount(document.body.appendChild(document.createElement("div")));
```

The element must be one that can host a shadow root, such as a `div`. Keep the inspector out of production builds with a condition your bundler can remove: nothing in Anchor depends on it.

| Option          | Default  | Meaning                                                                       |
| --------------- | -------- | ----------------------------------------------------------------------------- |
| `anchor`        | required | The Anchor to inspect. A wrapper reads it from the provider instead.          |
| `initialIsOpen` | `false`  | Opens the panel on the first visit. Later visits restore the last open state. |
| `maxEvents`     | `200`    | Timeline rows kept in memory, clamped to 1 to 1000, the newest kept.          |

The inspector accepts any object with a `diagnostics` member, and its type names nothing else, so it has no way to call `start`, `sync`, `getToken`, `end` or `dispose`. The class also has `unmount()`, `setAnchor(anchor)` and `setMaxEvents(count)`. Mounting twice throws an `AnchorError` with the code `INVALID_CONFIGURATION`; unmounting twice does nothing. Recorded rows survive an unmount, so the timeline is still there when the inspector is mounted again.

## What the panel shows

- **Launcher**: a pill with a status dot that follows the session: grey while `initializing`, blue when `signed-out`, green when `signed-in`, amber when `action-required` and red when `unavailable`.
- **Header**: the lifecycle, the adapter's name, the session status, the generation and the session key. The principal reads `principal hidden` until you turn on **Show values**. The panel docks to the bottom or to the right and resizes by dragging its edge or with the arrow keys.
- **Operations in flight**: each read, `active` or `queued`, with its waiting `sync()` callers; each token request with its profile, whether it forces a refresh, its waiters and its session; each ending with its session. Session keys are shortened.
- **Timeline**: every event, newest first, with its time, type, session and context. Expanding a row shows the context as JSON with a Copy button. Search matches the type, the session key and the context, and group chips narrow to Lifecycle, Reads, Session, Tokens, Ending or Callbacks, each with a live count. Pause stops recording and Clear empties the timeline; neither touches the Anchor.

The inspector renders in a shadow root and carries its own small UI runtime, so your application needs nothing installed for it and neither side's styles reach the other. It subscribes to `diagnostics` and `diagnostics.events` when it mounts and releases both when it unmounts; pause releases the event stream only, because observing the snapshot creates no demand. After `anchor.dispose()` the panel keeps the last snapshot and the `anchor disposed` row. The open state, the dock, the size and **Show values** are remembered in `localStorage` under `@priemskiyyy/anchor-devtools`; a stored value that does not parse is forgotten.

The launcher and every control are native buttons or inputs with a visible focus ring, the panel is a labelled complementary landmark, Escape closes it and returns focus to the launcher, and motion is removed for people who ask for less of it. See the [package README](https://github.com/priemskiyyy/anchor/tree/main/packages/devtools#readme) for the rest.
