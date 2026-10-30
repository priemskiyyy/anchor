# @priemskiyyy/anchor-react

React bindings for Anchor: a provider that publishes one Anchor, `useAnchor()` for the Anchor itself, and `useSession()` for its session state or one selection of it. The hooks only observe: they never start the Anchor, read the provider, mint a token or end a session. React Native uses this package as it is.

Version 0.1.1 is an initial preview. APIs may change before 1.0. See the [verification limits](https://github.com/priemskiyyy/anchor/blob/main/docs/verification.md) before adopting an adapter.

## Installation

```sh
pnpm add @priemskiyyy/anchor @priemskiyyy/anchor-react
```

## Set up

Create the Anchor once, register its type, start it, and publish it:

```tsx
import { Anchor } from "@priemskiyyy/anchor";
import { AnchorProvider } from "@priemskiyyy/anchor-react";
import { firebase, idToken } from "@priemskiyyy/anchor-firebase";

export const anchor = new Anchor({
  adapter: firebase({ sdk: auth, tokens: { api: idToken() } }),
});

declare module "@priemskiyyy/anchor-react" {
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

`start()` rejects only when the adapter cannot open or the Anchor was already disposed, so report it. Whoever constructs the Anchor starts and disposes it. The provider does neither, so Strict Mode's double mount and every unmount leave it alone.

## Read the session

<!-- snippet: fragment -->

```tsx
const Account = () => {
  const state = useSession();

  if (state.status === "initializing") {
    return <Splash />;
  }

  if (state.status === "unavailable") {
    return <SessionProblem error={state.error} />;
  }

  if (state.status === "action-required") {
    return <CompleteStep kind={state.action.kind} />;
  }

  if (state.status === "signed-out") {
    return <SignIn />;
  }

  return <Projects session={state.session} />;
};
```

A selector renders again only when its selection changes by `Object.is`:

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

const Projects = ({ session }: ProjectsProps) => {
  const projects = useQuery({
    queryKey: ["projects", session.key],
    queryFn: async ({ signal }) => {
      const token = await session.getToken("api", { signal });

      return getProjects(token);
    },
  });

  return <button onClick={() => session.end()}>Sign out</button>;
};
```

## Server rendering

On the server and during hydration every hook reads `initializing`, so the server's markup and the client's first render agree. The client then renders the real state.

## API

| Export                                                                                                        | What it is                                                              |
| ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `AnchorProvider`                                                                                              | Publishes one Anchor to the tree below.                                 |
| `useAnchor()`                                                                                                 | The nearest provider's Anchor, for `anchor.sync()` and `anchor.native`. |
| `useSession()`                                                                                                | The session state.                                                      |
| `useSession(selector)`                                                                                        | One selection of the session state.                                     |
| `Register`                                                                                                    | The interface to augment with `anchor: typeof anchor`.                  |
| `RegisteredAnchor`, `RegisteredSessionState`, `RegisteredSession`, `RegisteredUser`, `RegisteredTokenProfile` | The types the registration resolves to.                                 |

A hook outside a provider throws an `AnchorError` with the code `INVALID_CONFIGURATION`.

## License

MIT
