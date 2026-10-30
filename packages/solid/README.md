# @priemskiyyy/anchor-solid

Solid bindings for Anchor: a provider that publishes one Anchor, `useAnchor()` for the Anchor itself, and `useSession()` for its session state or one selection of it, as an accessor. The primitives only observe: they never start the Anchor, read the provider, mint a token or end a session.

Works in Solid 1.9 or newer.

Version 0.1.0 is an initial preview. APIs may change before 1.0. See the [verification limits](https://github.com/priemskiyyy/anchor/blob/main/docs/verification.md) before adopting an adapter.

## Installation

```sh
pnpm add @priemskiyyy/anchor @priemskiyyy/anchor-solid
```

## Set up

Create the Anchor once, register its type, start it, and publish it:

<!-- snippet: fragment -->

```tsx
import { Anchor } from "@priemskiyyy/anchor";
import { AnchorProvider } from "@priemskiyyy/anchor-solid";
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

export const Root = () => (
  <AnchorProvider anchor={anchor}>
    <Application />
  </AnchorProvider>
);
```

`start()` rejects only when the adapter cannot open or the Anchor was already disposed, so report it. Whoever constructs the Anchor starts and disposes it. The provider does neither, so a remount and every unmount leave it alone.

## Read the session

Call the primitives while a component is created, like any context reader:

<!-- snippet: fragment -->

```tsx
const Account = () => {
  const status = useSession((state) => state.status);
  const session = useSession((state) =>
    state.status === "signed-in" ? state.session : null,
  );

  return (
    <Switch fallback={<SignIn />}>
      <Match when={status() === "initializing"}>
        <Splash />
      </Match>
      <Match when={status() === "unavailable"}>
        <SessionProblem />
      </Match>
      <Match when={status() === "action-required"}>
        <CompleteStep />
      </Match>
      <Match when={session()}>
        {(session) => <Projects session={session()} />}
      </Match>
    </Switch>
  );
};
```

A selector's accessor changes only when its selection changes by `Object.is`, so `status` above updates nothing when only the user's data changes:

<!-- snippet: fragment -->

```tsx
const name = useSession((state) =>
  state.status === "signed-in" ? state.session.user.displayName : null,
);
```

## Use the session

Tokens and endings belong to the session they are called on, so a query keyed by `session.key` can never pair with another session's token:

<!-- snippet: fragment -->

```tsx
type ProjectsProps = { session: RegisteredSession };

const Projects = (props: ProjectsProps) => {
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

On the server and until a component is mounted, `useSession()` reads `initializing`. Solid claims server markup as it is while hydrating, so the server's markup and the hydrating client agree, and the client then renders the real state.

## API

| Export                                                                                                        | What it is                                                              |
| ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `AnchorProvider`                                                                                              | Publishes one Anchor to the tree below.                                 |
| `useAnchor()`                                                                                                 | The nearest provider's Anchor, for `anchor.sync()` and `anchor.native`. |
| `useSession()`                                                                                                | The session state, as an accessor.                                      |
| `useSession(selector)`                                                                                        | One selection of the session state, as an accessor.                     |
| `Register`                                                                                                    | The interface to augment with `anchor: typeof anchor`.                  |
| `RegisteredAnchor`, `RegisteredSessionState`, `RegisteredSession`, `RegisteredUser`, `RegisteredTokenProfile` | The types the registration resolves to.                                 |

A primitive outside a provider throws an `AnchorError` with the code `INVALID_CONFIGURATION`. `useSession()` follows a provider given another Anchor; `useAnchor()` returns the Anchor the provider held when the component was created.

## License

MIT
