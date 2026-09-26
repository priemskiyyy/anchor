---
description: "Run Simulcast realtime connections per Anchor session: replace the connection when session.key changes, give each connection a token callback bound to its own session, and close it when nobody is signed in."
---

# Simulcast integration

[Simulcast](https://github.com/priemskiyyy/simulcast) owns the lifecycle of realtime subscriptions: one connection session per client, one native subscription per channel shared by every consumer. A realtime connection authenticates as a user, so it belongs to a session in exactly Anchor's sense. Neither library depends on the other; this page shows how to tie a connection to the session it was opened for.

## Two sessions, one rule

Simulcast's session is a connection: changing its `id` replaces the connection and reattaches every channel that still has consumers, and `enabled: false` releases it. Anchor's session is a security context: `session.key` changes exactly when the user, tenant, organization, provider session, guest state or impersonation does. Give the connection the key as its id, and a new security context is a new connection, while an update of the user's data keeps it.

Simulcast adapters capture their configuration when they are created, token callbacks included. Its own guidance for a connection that must switch accounts is to give the callback a source of truth that follows the signed-in user, or to create one client per account. With Anchor, create one client per session, whose token callback asks that session for its token: a connection opened for Ada then asks Ada's session, and once Grace is signed in that request rejects with `SESSION_CHANGED` instead of minting Grace's token for Ada's connection. A callback that read `anchor.session.get()` when it runs would mint for whoever is signed in by then.

## In React

Declare a profile for the realtime service on your adapter, such as `realtime`, then create the client for the session:

<!-- snippet: fragment -->

```tsx
import type { RegisteredSession } from "@priemskiyyy/anchor-react";
import { useSession } from "@priemskiyyy/anchor-react";
import { RealtimeClient } from "@priemskiyyy/simulcast";
import { centrifugo } from "@priemskiyyy/simulcast-centrifugo";
import { RealtimeProvider } from "@priemskiyyy/simulcast-react";
import type { ReactNode } from "react";
import { useMemo } from "react";

const createRealtime = (getToken: RegisteredSession["getToken"]) =>
  new RealtimeClient({
    adapter: centrifugo({
      transport: "wss://realtime.example.com/connection/websocket",
      options: {
        getToken: async () => {
          const token = await getToken("realtime");

          return token.value;
        },
      },
    }),
  });

const SessionRealtime = ({
  session,
  children,
}: {
  session: RegisteredSession;
  children: ReactNode;
}) => {
  const { key, getToken } = session;
  const realtime = useMemo(() => createRealtime(getToken), [getToken]);

  return (
    <RealtimeProvider client={realtime} session={{ id: key }}>
      {children}
    </RealtimeProvider>
  );
};

export const Realtime = ({ children }: { children: ReactNode }) => {
  const session = useSession((state) =>
    state.status === "signed-in" ? state.session : null,
  );

  if (session === null) {
    return null;
  }

  return <SessionRealtime session={session}>{children}</SessionRealtime>;
};
```

- `session.getToken` is the same function across the updates of one session and another function for the next one, so the memo creates a client exactly when the session is replaced.
- The provider connects while it is mounted, and a new client, or a new `id`, tears down the previous connection first. Simulcast's hooks below it subscribe to the new client.
- Wrap only the components that use Simulcast's hooks in `Realtime`: while nobody is signed in, or the session is `action-required` and cannot mint, it renders nothing and no connection is open.

## Without a framework

`connect()` starts a client's session and answers its cleanup. With the `createRealtime` above:

<!-- snippet: fragment -->

```ts
let disconnect: (() => void) | null = null;
let connectedKey: string | null = null;

anchor.session.subscribe(() => {
  const state = anchor.session.get();
  const session = state.status === "signed-in" ? state.session : null;

  if ((session?.key ?? null) === connectedKey) {
    return;
  }

  disconnect?.();
  disconnect = null;
  connectedKey = session?.key ?? null;

  if (session === null) {
    return;
  }

  disconnect = createRealtime(session.getToken).connect();
});
```

## Supabase Realtime

Simulcast's Supabase adapter takes realtime-js options, including its `accessToken` callback. Over `@priemskiyyy/anchor-supabase`, that callback can ask the session for its `accessToken()` profile in the same way, from one client per session.

## What was verified

This page's snippets are not typechecked, because Simulcast is not installed in this repository; the Anchor members they use, `useSession` with a selector, `session.key` and `session.getToken`, are typechecked on the [React](react.md) and [token profiles](token-profiles.md) pages. The Simulcast half was written from the source of Simulcast 0.4.0: `RealtimeProvider` connects in an effect keyed on its client, the session's `id` and `enabled`, `connect()` answers its cleanup, `useChannel` subscribes again when its client changes, and the Centrifugo adapter hands its `options`, `getToken` included, to a new `Centrifuge` for every session. None of it was run here. What Centrifuge, or realtime-js, does with a token callback that rejects is the SDK's own behavior and was not verified.
