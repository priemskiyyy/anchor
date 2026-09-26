---
description: "Use Anchor in Vue 3.5: publish it with AnchorProvider, read the session with useSession as a read-only computed ref, and mint tokens and end sessions from the session itself."
---

# Vue

`@priemskiyyy/anchor-vue` is a provider that publishes one Anchor, `useAnchor()` for the Anchor itself, and `useSession()` for its session state or one selection of it, as a read-only computed ref. The composables only observe: they never start the Anchor, read the provider, mint a token or end a session. It works in Vue 3.5 or newer.

```sh
pnpm add @priemskiyyy/anchor @priemskiyyy/anchor-vue
```

## Set it up

Create the Anchor once, register its type and start it:

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

Then publish it:

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

The `Register` augmentation types every composable with this Anchor: its user, its token profiles and its SDK. Whoever constructs the Anchor starts and disposes it. The provider does neither, so a remount and every unmount leave it alone.

## Read the session

Call the composables in `setup`, like any injection:

```vue
<script setup lang="ts">
import { useSession } from "@priemskiyyy/anchor-vue";

const state = useSession();
</script>

<template>
  <p v-if="state.status === 'initializing'">Restoring your session</p>
  <p v-else-if="state.status === 'unavailable'">
    The sign-in service cannot be reached.
  </p>
  <p v-else-if="state.status === 'action-required'">
    Finish {{ state.action.kind }} to continue.
  </p>
  <p v-else-if="state.status === 'signed-out'">Signed out</p>
  <p v-else>Signed in as {{ state.session.user.email }}</p>
</template>
```

A selector's ref changes only when its selection changes by `Object.is`. A composable of your own can build on it:

```ts
import { useSession } from "@priemskiyyy/anchor-vue";
import { computed } from "vue";

export const useDisplayName = () => {
  const name = useSession((state) =>
    state.status === "signed-in" ? state.session.user.displayName : null,
  );

  return computed(() => name.value ?? "Welcome");
};
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

On the server and until a component is mounted, `useSession()` reads `initializing`, so the server's markup and the hydrating client's first render agree. The client then renders the real state. See [server and SSR](server-rendering.md).

## API

| Export                                                                                                        | What it is                                                              |
| ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `AnchorProvider`                                                                                              | Publishes one Anchor to the components below.                           |
| `useAnchor()`                                                                                                 | The nearest provider's Anchor, for `anchor.sync()` and `anchor.native`. |
| `useSession()`                                                                                                | The session state, as a read-only computed ref.                         |
| `useSession(selector)`                                                                                        | One selection of the session state, as a read-only computed ref.        |
| `Register`                                                                                                    | The interface to augment with `anchor: typeof anchor`.                  |
| `RegisteredAnchor`, `RegisteredSessionState`, `RegisteredSession`, `RegisteredUser`, `RegisteredTokenProfile` | The types the registration resolves to.                                 |

A composable outside a provider throws an `AnchorError` with the code `INVALID_CONFIGURATION`. `useSession()` follows a provider given another Anchor; `useAnchor()` returns the Anchor the provider held when the component was set up. The package needs `vue` 3.5 or newer, below 4. See the [package README](https://github.com/priemskiyyy/anchor/tree/main/packages/vue#readme).
