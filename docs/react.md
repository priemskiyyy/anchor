---
description: "Use Anchor in React and React Native: publish it with AnchorProvider, read the session with useSession and a selector, and mint tokens and end sessions from the session itself, with hooks that start nothing."
---

# React

`@priemskiyyy/anchor-react` is a provider that publishes one Anchor, `useAnchor()` for the Anchor itself, and `useSession()` for its session state or one selection of it. The hooks only observe: they never start the Anchor, read the provider, mint a token or end a session. React Native uses this package as it is.

```sh
pnpm add @priemskiyyy/anchor @priemskiyyy/anchor-react
```

## Set it up

Create the Anchor once, register its type, start it, and publish it:

```tsx
import { Anchor } from "@priemskiyyy/anchor";
import { firebase, idToken } from "@priemskiyyy/anchor-firebase";
import { AnchorProvider } from "@priemskiyyy/anchor-react";

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

The `Register` augmentation types every hook with this Anchor: its user, its token profiles and its SDK. Without it, the provider refuses an Anchor that declares token profiles, so the registration cannot be forgotten. `start()` rejects only when the adapter cannot open or the Anchor was disposed, so report it.

## AnchorProvider

Publishes one Anchor to the tree below and does nothing else. Whoever constructs the Anchor starts and disposes it: mounting the provider starts nothing, and unmounting it disposes nothing, so Strict Mode's double mount and every unmount leave it alone. A provider given another Anchor publishes the new one: the hooks below it move to it and release every listener on the previous one.

## useSession

```tsx
import { useSession } from "@priemskiyyy/anchor-react";

export const Account = () => {
  const state = useSession();

  if (state.status === "initializing") {
    return <p>Restoring your session</p>;
  }

  if (state.status === "unavailable") {
    return <p>The sign-in service cannot be reached ({state.error.code}).</p>;
  }

  if (state.status === "signed-out") {
    return <p>Signed out</p>;
  }

  if (state.status === "action-required") {
    return <p>Finish {state.action.kind} to continue.</p>;
  }

  return <p>Signed in as {state.session.user.email}</p>;
};
```

`useSession()` answers the session state and renders again when it changes. With a selector, it answers one selection and renders again only when that selection changes by `Object.is`:

```tsx
import { useSession } from "@priemskiyyy/anchor-react";

export const Greeting = () => {
  const name = useSession((state) =>
    state.status === "signed-in" ? state.session.user.displayName : null,
  );

  return <p>{name ?? "Welcome"}</p>;
};
```

A selection is recomputed only when the state or the selector changes, so an inline selector that answers a primitive never renders on unrelated changes, and a selector that builds a new object each call is stable within a render. A token refresh that leaves the session unchanged renders nothing at all.

## useAnchor

```tsx
import { useAnchor } from "@priemskiyyy/anchor-react";

export const RetryButton = () => {
  const anchor = useAnchor();

  const handleRetryPress = () => {
    anchor.sync().catch(reportError);
  };

  return <button onClick={handleRetryPress}>Try again</button>;
};
```

Answers the nearest provider's Anchor, for `anchor.sync()` and `anchor.native`. Its members are arrow fields, so they can be passed around.

## Use the session

Tokens and endings belong to the session they are called on. A query keyed by `session.key` is a new query for every new session, and its token is asked of its own session, so it can never pair one session's data with another session's token:

```tsx
import type { RegisteredSession } from "@priemskiyyy/anchor-react";
import { useQuery } from "@tanstack/react-query";

type Project = { id: string; name: string };

const getProjects = async (
  session: RegisteredSession,
  signal: AbortSignal,
): Promise<Project[]> => {
  const token = await session.getToken("api", { signal });

  const response = await fetch("/api/projects", {
    headers: { authorization: `${token.scheme ?? "Bearer"} ${token.value}` },
    signal,
  });

  return response.json();
};

export const Projects = ({ session }: { session: RegisteredSession }) => {
  const projects = useQuery({
    queryKey: ["projects", session.key],
    queryFn: ({ signal }) => getProjects(session, signal),
  });

  const handleSignOutPress = () => {
    session.end().catch(reportError);
  };

  return (
    <section>
      <ul>
        {(projects.data ?? []).map((project) => (
          <li key={project.id}>{project.name}</li>
        ))}
      </ul>
      <button onClick={handleSignOutPress}>Sign out</button>
    </section>
  );
};
```

When another user signs in while the request runs, its `getToken` rejects with `SESSION_CHANGED`, and the new session's query starts under the new key. Mint and end in event handlers and effects, never while rendering: rendering never starts, reads, mints or ends anything.

## Server rendering

On the server and during hydration every hook reads `initializing`, so the server's markup and the client's first render agree, and the client then renders the real state. The package's bundle starts with a `"use client"` directive, so the provider and the hooks can be imported from a React Server Components tree. See [server and SSR](server-rendering.md).

## API

| Export                                                                                                        | What it is                                                              |
| ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `AnchorProvider`                                                                                              | Publishes one Anchor to the tree below.                                 |
| `useAnchor()`                                                                                                 | The nearest provider's Anchor, for `anchor.sync()` and `anchor.native`. |
| `useSession()`                                                                                                | The session state.                                                      |
| `useSession(selector)`                                                                                        | One selection of the session state.                                     |
| `Register`                                                                                                    | The interface to augment with `anchor: typeof anchor`.                  |
| `RegisteredAnchor`, `RegisteredSessionState`, `RegisteredSession`, `RegisteredUser`, `RegisteredTokenProfile` | The types the registration resolves to.                                 |

A hook outside a provider throws an `AnchorError` with the code `INVALID_CONFIGURATION`. The package needs `react` 19.2 or newer, below 20. The inspector's React wrapper is in [diagnostics and devtools](devtools.md), and the [package README](https://github.com/priemskiyyy/anchor/tree/main/packages/react#readme) is the reference.
