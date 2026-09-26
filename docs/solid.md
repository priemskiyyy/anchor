---
description: "Use Anchor in Solid 1.9: publish it with AnchorProvider, read the session with useSession as an accessor, and mint tokens and end sessions from the session itself."
---

# Solid

`@priemskiyyy/anchor-solid` is a provider that publishes one Anchor, `useAnchor()` for the Anchor itself, and `useSession()` for its session state or one selection of it, as an accessor. The primitives only observe: they never start the Anchor, read the provider, mint a token or end a session. It works in Solid 1.9 or newer.

```sh
pnpm add @priemskiyyy/anchor @priemskiyyy/anchor-solid
```

## Set it up

Create the Anchor once, register its type and start it:

```ts
import { Anchor } from "@priemskiyyy/anchor";
import { firebase, idToken } from "@priemskiyyy/anchor-firebase";

export const anchor = new Anchor({
  adapter: firebase({ sdk: auth, tokens: { api: idToken() } }),
});

declare module "@priemskiyyy/anchor-solid" {
  interface Register {
    anchor: typeof anchor;
  }
}

// Not awaited: the tree renders `initializing` until the first state is known.
anchor.start().catch(reportError);
```

Then publish it:

<!-- snippet: fragment -->

```tsx
import { AnchorProvider } from "@priemskiyyy/anchor-solid";

export const Root = () => (
  <AnchorProvider anchor={anchor}>
    <Application />
  </AnchorProvider>
);
```

The `Register` augmentation types every primitive with this Anchor: its user, its token profiles and its SDK. Whoever constructs the Anchor starts and disposes it. The provider does neither, so a remount and every unmount leave it alone.

## Read the session

Call the primitives while a component is created, like any context reader:

<!-- snippet: fragment -->

```tsx
import { useSession } from "@priemskiyyy/anchor-solid";
import { Match, Switch } from "solid-js";

export const Account = () => {
  const status = useSession((state) => state.status);
  const session = useSession((state) =>
    state.status === "signed-in" ? state.session : null,
  );

  return (
    <Switch fallback={<p>Signed out</p>}>
      <Match when={status() === "initializing"}>
        <p>Restoring your session</p>
      </Match>
      <Match when={status() === "unavailable"}>
        <p>The sign-in service cannot be reached.</p>
      </Match>
      <Match when={status() === "action-required"}>
        <p>Finish the step your provider asks for.</p>
      </Match>
      <Match when={session()}>
        {(session) => <p>Signed in as {session().user.email}</p>}
      </Match>
    </Switch>
  );
};
```

A selector's accessor changes only when its selection changes by `Object.is`, so `status` above updates nothing when only the user's data changes. A primitive of your own can build on it:

```ts
import { useSession } from "@priemskiyyy/anchor-solid";

export const useDisplayName = () => {
  const name = useSession((state) =>
    state.status === "signed-in" ? state.session.user.displayName : null,
  );

  return () => name() ?? "Welcome";
};
```

## Use the session

Tokens and endings belong to the session they are called on, so a query keyed by `session.key` can never pair with another session's token:

<!-- snippet: fragment -->

```tsx
import type { RegisteredSession } from "@priemskiyyy/anchor-solid";
import { useQuery } from "@tanstack/solid-query";

export const Projects = (props: { session: RegisteredSession }) => {
  const projects = useQuery(() => ({
    queryKey: ["projects", props.session.key],
    queryFn: async ({ signal }) => {
      const token = await props.session.getToken("api", { signal });

      return getProjects(token);
    },
  }));

  return <button onClick={() => props.session.end()}>Sign out</button>;
};
```

## Server rendering

On the server and until a component is mounted, `useSession()` reads `initializing`. Solid claims server markup as it is while hydrating, so the server's markup and the hydrating client agree, and the client then renders the real state. See [server and SSR](server-rendering.md).

## API

| Export                                                                                                        | What it is                                                              |
| ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `AnchorProvider`                                                                                              | Publishes one Anchor to the tree below.                                 |
| `useAnchor()`                                                                                                 | The nearest provider's Anchor, for `anchor.sync()` and `anchor.native`. |
| `useSession()`                                                                                                | The session state, as an accessor.                                      |
| `useSession(selector)`                                                                                        | One selection of the session state, as an accessor.                     |
| `Register`                                                                                                    | The interface to augment with `anchor: typeof anchor`.                  |
| `RegisteredAnchor`, `RegisteredSessionState`, `RegisteredSession`, `RegisteredUser`, `RegisteredTokenProfile` | The types the registration resolves to.                                 |

A primitive outside a provider throws an `AnchorError` with the code `INVALID_CONFIGURATION`. `useSession()` follows a provider given another Anchor; `useAnchor()` returns the Anchor the provider held when the component was created. The package needs `solid-js` 1.9 or newer, below 2. See the [package README](https://github.com/priemskiyyy/anchor/tree/main/packages/solid#readme).
