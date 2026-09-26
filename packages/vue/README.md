# @priemskiyyy/anchor-vue

Vue bindings for Anchor: a provider that publishes one Anchor, `useAnchor()` for the Anchor itself, and `useSession()` for its session state or one selection of it, as a read-only computed ref. The composables only observe: they never start the Anchor, read the provider, mint a token or end a session.

Works in Vue 3.5 or newer.

## Installation

```sh
pnpm add @priemskiyyy/anchor @priemskiyyy/anchor-vue
```

## Set up

Create the Anchor once, register its type, start it, and publish it:

```ts
import { Anchor } from "@priemskiyyy/anchor";
import { firebase, idToken } from "@priemskiyyy/anchor-firebase";

export const anchor = new Anchor({
  adapter: firebase({ sdk: auth, tokens: { api: idToken() } }),
});

declare module "@priemskiyyy/anchor-vue" {
  interface Register {
    anchor: typeof anchor;
  }
}

// Not awaited: the tree renders `initializing` until the first state is known.
anchor.start().catch(reportError);
```

```vue
<script setup lang="ts">
import { AnchorProvider } from "@priemskiyyy/anchor-vue";
import { anchor } from "./anchor";
</script>

<template>
  <AnchorProvider :anchor="anchor">
    <Application />
  </AnchorProvider>
</template>
```

`start()` rejects only when the adapter cannot open or the Anchor was already disposed, so report it. Whoever constructs the Anchor starts and disposes it. The provider does neither, so a remount and every unmount leave it alone.

## Read the session

Call the composables in `setup`, like any injection:

```vue
<script setup lang="ts">
import { useSession } from "@priemskiyyy/anchor-vue";

const state = useSession();
</script>

<template>
  <Splash v-if="state.status === 'initializing'" />
  <SessionProblem
    v-else-if="state.status === 'unavailable'"
    :error="state.error"
  />
  <CompleteStep
    v-else-if="state.status === 'action-required'"
    :kind="state.action.kind"
  />
  <SignIn v-else-if="state.status === 'signed-out'" />
  <Projects v-else :session="state.session" />
</template>
```

A selector's ref changes only when its selection changes by `Object.is`:

<!-- snippet: fragment -->

```ts
const name = useSession((state) =>
  state.status === "signed-in" ? state.session.user.displayName : null,
);
```

## Use the session

Tokens and endings belong to the session they are called on, so a query keyed by `session.key` can never pair with another session's token:

```vue
<script setup lang="ts">
import type { RegisteredSession } from "@priemskiyyy/anchor-vue";
import { useQuery } from "@tanstack/vue-query";
import { computed } from "vue";

const props = defineProps<{ session: RegisteredSession }>();

const projects = useQuery({
  queryKey: computed(() => ["projects", props.session.key]),
  queryFn: async ({ signal }) => {
    const token = await props.session.getToken("api", { signal });

    return getProjects(token);
  },
});
</script>

<template>
  <button type="button" @click="props.session.end()">Sign out</button>
</template>
```

## Server rendering

On the server and until a component is mounted, `useSession()` reads `initializing`, so the server's markup and the hydrating client's first render agree. The client then renders the real state.

## API

| Export                                                                                                        | What it is                                                              |
| ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `AnchorProvider`                                                                                              | Publishes one Anchor to the components below.                           |
| `useAnchor()`                                                                                                 | The nearest provider's Anchor, for `anchor.sync()` and `anchor.native`. |
| `useSession()`                                                                                                | The session state, as a read-only computed ref.                         |
| `useSession(selector)`                                                                                        | One selection of the session state, as a read-only computed ref.        |
| `Register`                                                                                                    | The interface to augment with `anchor: typeof anchor`.                  |
| `RegisteredAnchor`, `RegisteredSessionState`, `RegisteredSession`, `RegisteredUser`, `RegisteredTokenProfile` | The types the registration resolves to.                                 |

A composable outside a provider throws an `AnchorError` with the code `INVALID_CONFIGURATION`. `useSession()` follows a provider given another Anchor; `useAnchor()` returns the Anchor the provider held when the component was set up.

## License

MIT
