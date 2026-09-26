---
description: "Create an Anchor over Firebase, start it, read the session state, sign in through your own SDK, mint a token for the current session, end it, and publish it to React."
---

# Getting started

## Install

```sh
pnpm add @priemskiyyy/anchor @priemskiyyy/anchor-firebase firebase
```

`@priemskiyyy/anchor` is the core: no dependencies, ESM only, no side effects on import. Each provider has an adapter package. This page uses Firebase; [choose an adapter](adapters.md) lists the others, and the code below changes only where the adapter is created.

## Create an Anchor

```ts
import { Anchor } from "@priemskiyyy/anchor";
import { firebase, idToken } from "@priemskiyyy/anchor-firebase";
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const app = initializeApp(firebaseConfig);

export const anchor = new Anchor({
  adapter: firebase({ sdk: getAuth(app), tokens: { api: idToken() } }),
});

await anchor.start();
```

You initialize Firebase and hand its `Auth` to the adapter. Anchor never initializes, configures or closes it. Constructing the Anchor does nothing, so it is safe at module scope and on a server. `start()` opens the adapter and resolves once the first state is known, whatever it is; calling it again returns the same promise. It rejects only when the adapter cannot open (`START_FAILED`, and a later `start()` tries again) or the Anchor was disposed (`DISPOSED`).

`tokens` names the token profiles a session can mint. Here there is one, `api`, which mints the user's Firebase ID token. The names are yours, and they type `getToken`.

One adapter call may take 10 seconds. Pass `timeout`, in milliseconds, to change that: a whole number from 1 to 2147483647, or the constructor throws `AnchorError` `INVALID_CONFIGURATION`.

## Read the session

```ts
const stop = anchor.session.subscribe(() => {
  const state = anchor.session.get();

  if (state.status !== "signed-in") {
    return;
  }

  console.log(`Signed in as ${state.session.principal.subject}`);
});
```

`anchor.session.get()` answers the current state synchronously. The state is frozen and stays the same object until something changes. `subscribe` hears every change, never calls back at once, and returns the function that stops listening.

| `status`          | What it means                                                                                                    |
| ----------------- | ---------------------------------------------------------------------------------------------------------------- |
| `initializing`    | The first resolution has not finished. It never comes back.                                                      |
| `signed-out`      | The provider positively says there is no session.                                                                |
| `signed-in`       | `state.session` is the session.                                                                                  |
| `action-required` | The provider blocks the session on a step, `state.action.kind`. The session cannot mint tokens and can be ended. |
| `unavailable`     | The first resolution failed; `state.error` says why. It is not a sign-out.                                       |

See [session state](session-state.md) for each state and the lifecycle around them.

## Sign in with your SDK

```ts
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";

await signInWithPopup(anchor.native, new GoogleAuthProvider());
```

`anchor.native` is the `Auth` you passed in, typed as Firebase's own. The Firebase adapter hears the sign-in through `onIdTokenChanged` and Anchor publishes `signed-in`. An adapter whose SDK emits nothing, such as Auth0's, needs `await anchor.sync()` after such a call instead; each adapter's page says which kind it is.

## Call your API with a token

```ts
export const getProjects = async (signal: AbortSignal) => {
  const state = anchor.session.get();

  if (state.status !== "signed-in") {
    return null;
  }

  const token = await state.session.getToken("api", { signal });

  return fetch("/api/projects", {
    headers: { authorization: `${token.scheme ?? "Bearer"} ${token.value}` },
    signal,
  });
};
```

The token belongs to the session it was asked of. If the user signs out, or another user signs in, while the request runs, `getToken` rejects with `SESSION_CHANGED` instead of resolving for whoever is signed in now. Concurrent callers of one profile share one request. Anchor keeps no token once the request settles: caching is Firebase's. See [token profiles](token-profiles.md).

## End the session

```ts
const state = anchor.session.get();

if (state.status === "signed-in") {
  const result = await state.session.end();

  console.log(result); // { local: "completed", remote: "not-applicable", navigation: null }
}
```

`end()` ends this session in this application and nothing more: the adapter calls Firebase's `signOut()`, and only while Firebase still holds the session's user. It never signs out another device or the identity provider. The result says what was proved: the local sign-out completed, and there is no remote step, because the Firebase client cannot revoke refresh tokens. Anchor then publishes `signed-out`. See [ending a session](ending-a-session.md).

## Publish it to React

```sh
pnpm add @priemskiyyy/anchor-react
```

```tsx
import { AnchorProvider, useSession } from "@priemskiyyy/anchor-react";

declare module "@priemskiyyy/anchor-react" {
  interface Register {
    anchor: typeof anchor;
  }
}

const Account = () => {
  const state = useSession();

  if (state.status === "initializing") {
    return <p>Restoring your session</p>;
  }

  if (state.status === "unavailable") {
    return <p>The sign-in service cannot be reached.</p>;
  }

  if (state.status === "signed-out") {
    return <p>Signed out</p>;
  }

  if (state.status === "action-required") {
    return <p>Finish {state.action.kind} to continue.</p>;
  }

  return <p>Hello, {state.session.user.displayName}</p>;
};

export const Root = () => (
  <AnchorProvider anchor={anchor}>
    <Account />
  </AnchorProvider>
);
```

`anchor` is the Anchor you created above, and the `Register` block types every hook with it. The provider only publishes the Anchor: mounting it starts nothing and unmounting it disposes nothing, so `anchor.start()` stays where you created the Anchor. The same provider and hooks exist for [Vue](vue.md), [Solid](solid.md) and [Svelte](svelte.md), and React Native uses the [React](react.md) binding as it is.

## Next

- [Session identity and `session.key`](session-identity.md): when a session is replaced, and what the key is safe for.
- [Browser lifecycle](browser-lifecycle.md): read again when the page becomes visible or another tab signs out.
- [Diagnostics and devtools](devtools.md): watch the reads, tokens and endings as they happen.
