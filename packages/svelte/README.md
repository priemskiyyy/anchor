# @priemskiyyy/anchor-svelte

Svelte bindings for Anchor: a provider component that publishes one Anchor, `useAnchor()` for the Anchor itself, and `useSession()` for its session state or one selection of it, read through `current`. The utilities only observe: they never start the Anchor, read the provider, mint a token or end a session.

Works in Svelte 5.7 or newer. The package ships Svelte sources, so it is compiled by your application's own Svelte.

Version 0.1.1 is an initial preview. APIs may change before 1.0. See the [verification limits](https://github.com/priemskiyyy/anchor/blob/main/docs/verification.md) before adopting an adapter.

## Installation

```sh
pnpm add @priemskiyyy/anchor @priemskiyyy/anchor-svelte
```

## Set up

Create the Anchor once, register its type, start it, and publish it:

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

```svelte
<script lang="ts">
  import { AnchorProvider } from "@priemskiyyy/anchor-svelte";
  import { anchor } from "./anchor";
</script>

<AnchorProvider {anchor}>
  <Application />
</AnchorProvider>
```

`start()` rejects only when the adapter cannot open or the Anchor was already disposed, so report it. Whoever constructs the Anchor starts and disposes it. The provider does neither, so a remount and every unmount leave it alone.

## Read the session

Call the utilities while a component is created, like any Svelte context reader:

```svelte
<script lang="ts">
  import { useSession } from "@priemskiyyy/anchor-svelte";

  const state = useSession();
</script>

{#if state.current.status === "initializing"}
  <Splash />
{:else if state.current.status === "unavailable"}
  <SessionProblem error={state.current.error} />
{:else if state.current.status === "action-required"}
  <CompleteStep kind={state.current.action.kind} />
{:else if state.current.status === "signed-out"}
  <SignIn />
{:else}
  <Projects session={state.current.session} />
{/if}
```

A selector's `current` changes only when its selection changes by `Object.is`:

<!-- snippet: fragment -->

```ts
const name = useSession((state) =>
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

On the server and until a component is mounted, `useSession()` reads `initializing`, so the server's markup and the hydrating render agree. The client then renders the real state.

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

A utility outside a provider throws an `AnchorError` with the code `INVALID_CONFIGURATION`; Svelte appends the component stack to its message in development. `useSession()` follows a provider given another Anchor; `useAnchor()` returns the Anchor the provider held when the component was created.

## License

MIT
