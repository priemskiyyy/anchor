---
description: "Use Anchor in Svelte 5: publish it with the AnchorProvider component, read the session with useSession through current, and mint tokens and end sessions from the session itself."
---

# Svelte

`@priemskiyyy/anchor-svelte` is a provider component that publishes one Anchor, `useAnchor()` for the Anchor itself, and `useSession()` for its session state or one selection of it, read through `current`. The utilities only observe: they never start the Anchor, read the provider, mint a token or end a session. It works in Svelte 5.7 or newer, and ships Svelte sources, so your application's own Svelte compiles it.

```sh
pnpm add @priemskiyyy/anchor @priemskiyyy/anchor-svelte
```

## Set it up

Create the Anchor once, register its type and start it:

```ts
import { Anchor } from "@priemskiyyy/anchor";
import { firebase, idToken } from "@priemskiyyy/anchor-firebase";

export const anchor = new Anchor({
  adapter: firebase({ sdk: auth, tokens: { api: idToken() } }),
});

declare module "@priemskiyyy/anchor-svelte" {
  interface Register {
    anchor: typeof anchor;
  }
}

// Not awaited: the tree renders `initializing` until the first state is known.
anchor.start().catch(reportError);
```

Then publish it:

```svelte
<script lang="ts">
  import { AnchorProvider } from "@priemskiyyy/anchor-svelte";
  import { anchor } from "./anchor";
</script>

<AnchorProvider {anchor}>
  <Application />
</AnchorProvider>
```

The `Register` augmentation types every utility with this Anchor: its user, its token profiles and its SDK. Whoever constructs the Anchor starts and disposes it. The provider does neither, so a remount and every unmount leave it alone.

## Read the session

Call the utilities while a component is created, like any Svelte context reader:

```svelte
<script lang="ts">
  import { useSession } from "@priemskiyyy/anchor-svelte";

  const state = useSession();
</script>

{#if state.current.status === "initializing"}
  <p>Restoring your session</p>
{:else if state.current.status === "unavailable"}
  <p>The sign-in service cannot be reached.</p>
{:else if state.current.status === "action-required"}
  <p>Finish {state.current.action.kind} to continue.</p>
{:else if state.current.status === "signed-out"}
  <p>Signed out</p>
{:else}
  <p>Signed in as {state.current.session.user.email}</p>
{/if}
```

A selector's `current` changes only when its selection changes by `Object.is`. A utility of your own can build on it, called while a component is created:

```ts
import { useSession } from "@priemskiyyy/anchor-svelte";

export const useDisplayName = () =>
  useSession((state) =>
    state.status === "signed-in" ? state.session.user.displayName : null,
  );
```

## Use the session

Tokens and endings belong to the session they are called on, so a query keyed by `session.key` can never pair with another session's token:

```svelte
<script lang="ts">
  import type { RegisteredSession } from "@priemskiyyy/anchor-svelte";
  import { createQuery } from "@tanstack/svelte-query";

  const props: { session: RegisteredSession } = $props();

  const projects = createQuery(() => ({
    queryKey: ["projects", props.session.key],
    queryFn: async ({ signal }) => {
      const token = await props.session.getToken("api", { signal });

      return getProjects(token);
    },
  }));
</script>

<button type="button" onclick={() => props.session.end()}>Sign out</button>
```

## Server rendering

On the server and until a component is mounted, `useSession()` reads `initializing`, so the server's markup and the hydrating render agree. The client then renders the real state. See [server and SSR](server-rendering.md).

## API

| Export                                                                                                        | What it is                                                              |
| ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `AnchorProvider`                                                                                              | Publishes one Anchor to the components below.                           |
| `useAnchor()`                                                                                                 | The nearest provider's Anchor, for `anchor.sync()` and `anchor.native`. |
| `useSession()`                                                                                                | The session state, read through `current`.                              |
| `useSession(selector)`                                                                                        | One selection of the session state, read through `current`.             |
| `Register`                                                                                                    | The interface to augment with `anchor: typeof anchor`.                  |
| `RegisteredAnchor`, `RegisteredSessionState`, `RegisteredSession`, `RegisteredUser`, `RegisteredTokenProfile` | The types the registration resolves to.                                 |
| `AnchorProviderProps`, `ReadableValue`                                                                        | The provider's props, and the `{ current }` type the utilities return.  |

A utility outside a provider throws an `AnchorError` with the code `INVALID_CONFIGURATION`; Svelte appends the component stack to its message in development. `useSession()` follows a provider given another Anchor; `useAnchor()` returns the Anchor the provider held when the component was created. The package needs `svelte` 5.7 or newer, below 6. See the [package README](https://github.com/priemskiyyy/anchor/tree/main/packages/svelte#readme).
