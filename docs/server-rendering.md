---
description: "Why an Anchor is safe to construct during a server render, what the bindings and devtools render on the server, and how @priemskiyyy/anchor-server reads one request's session with its response headers and an explicit hydration allowlist."
---

# Server and SSR

## Constructing is inert

`new Anchor(...)` reads its options and does nothing else: it opens no adapter, starts no timer and touches no SDK. Every adapter factory is cold too, so a module that creates an Anchor can be imported by a server render, a test or a build step without effect. Work begins at `start()`, and observing an Anchor, through a binding or the devtools, creates no demand.

The browser's Anchor is a client object: start it on the client, where its SDK runs. A request on the server has an Anchor of its own for the length of one read, through `@priemskiyyy/anchor-server` below.

## Bindings on the server

Every binding reads `initializing` on the server and until a component is mounted on the client, even when the Anchor already holds a session, because the server snapshot is the interned `initializing` state. The server's markup and the hydrating client's first render therefore agree, and the client then renders the real state. Each binding has a test that renders on a server with no `window` and subscribes to nothing, and one that hydrates the server's markup without a mismatch.

The React binding's bundle starts with a `"use client"` directive, so the provider and the hooks can be imported from a React Server Components tree. The [devtools](devtools.md) wrappers render only their empty host element on the server, and a Svelte attachment never runs there.

## Read a request

`@priemskiyyy/anchor-server` reads one request with a server adapter and answers its session state and the headers the provider wants set on the response, such as a refreshed session cookie. Each read stands alone: no observer, no Anchor shared between requests.

```sh
pnpm add @priemskiyyy/anchor @priemskiyyy/anchor-server @priemskiyyy/anchor-better-auth-node better-auth
```

```ts
import { betterAuth } from "@priemskiyyy/anchor-better-auth-node";
import {
  getRequestSession,
  getSessionHydration,
} from "@priemskiyyy/anchor-server";

import { auth } from "./auth";

const adapter = betterAuth({ sdk: auth });

export const handleRequest = async (request: Request) => {
  const { state, headers } = await getRequestSession(request, { adapter });

  if (state.status === "unavailable") {
    return new Response("Try again shortly.", { status: 503, headers });
  }

  const hydration = getSessionHydration(state, {
    select: ({ user }) => ({ name: user.name }),
  });

  return new Response(renderPage(state, hydration), { headers });
};
```

`getRequestSession` takes the request's `url`, `method` and `headers`, so a Fetch `Request` works as it is. Pass `headers` on in every branch: they reach you whatever the read answered, so a cookie the provider rotated or deleted before a read failed is still set. A provider that needs a redirect before it can tell who is signed in, as Clerk's handshake does, makes the state `unavailable` with `INTERACTION_REQUIRED` and puts the redirect in `headers`: answer it with `new Response(null, { status: 307, headers })`, as the [Clerk server adapter's page](adapters/clerk-node.md#the-handshake) shows.

| Option    | Default  | What it does                                                                                                                            |
| --------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `adapter` | required | The server adapter, such as `betterAuth({ sdk: auth })`.                                                                                |
| `timeout` | `10000`  | Milliseconds the read may take before the state is `unavailable` with `TIMEOUT`. An invalid value rejects with `INVALID_CONFIGURATION`. |

`state` has the client's shape without `initializing` and without the client's powers:

| `status`          | Carries                                                                                                                                                                                           |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `signed-out`      | nothing: the provider said there is no session                                                                                                                                                    |
| `signed-in`       | `session`: `principal`, `user` (a frozen copy), `guest`, `impersonated`                                                                                                                           |
| `action-required` | `action` and `session`: the user must finish a step first                                                                                                                                         |
| `unavailable`     | `error`: `READ_FAILED` with the provider's error as its `cause`, `TIMEOUT`, `INVALID_ANSWER`, or the code of an `AnchorError` the adapter threw, such as Clerk's `INTERACTION_REQUIRED` handshake |

A request's session has no `key`, no `getToken` and no `end`: those belong to the Anchor in the browser, which reads its own provider. A provider that cannot tell answers `unavailable`, never `signed-out`.

- Concurrent requests never see each other's session or headers, whatever order their reads settle in. Each read runs one throwaway Anchor over a one-shot adapter, so it gets the client's answer checks, timeout and error codes, and nothing is shared.
- A read that outlives `timeout` aborts its `signal` and answers `unavailable`. A late answer changes nothing, and neither do headers it sets late: the copy of the headers is taken when the state settles.

## Hydration

`getSessionHydration(state, { select })` answers what of the session may go on the page: its status, the `kind` of a required action, and exactly what `select` picks. It never carries a token, a cookie, SDK state or a provider error, and an `unavailable` hydration carries no error at all. Render it while the client's Anchor is still `initializing`:

```ts
import type { SessionState } from "@priemskiyyy/anchor";
import type { SessionHydration } from "@priemskiyyy/anchor-server";

export const getDisplayName = <
  TUser extends { name: string },
  TProfile extends string,
>(
  state: SessionState<TUser, TProfile>,
  hydration: SessionHydration<{ name: string }>,
) => {
  if (state.status === "signed-in") {
    return state.session.user.name;
  }

  if (state.status === "initializing" && hydration.status === "signed-in") {
    return hydration.user.name;
  }

  return null;
};
```

The client's Anchor never starts from the hydration. A serialized browser session is not evidence of who is signed in, so the first state still comes from the client's own provider.

## Server adapters

| Provider    | Package                                                                | Reads a request through                                         |
| ----------- | ---------------------------------------------------------------------- | --------------------------------------------------------------- |
| Better Auth | [`@priemskiyyy/anchor-better-auth-node`](adapters/better-auth-node.md) | `auth.api.getSession({ headers, returnHeaders: true })`         |
| Firebase    | [`@priemskiyyy/anchor-firebase-node`](adapters/firebase-node.md)       | firebase-admin's `verifyIdToken()` and `verifySessionCookie()`  |
| Supabase    | [`@priemskiyyy/anchor-supabase-node`](adapters/supabase-node.md)       | a `@supabase/ssr` server client's `auth.getUser()`              |
| Clerk       | [`@priemskiyyy/anchor-clerk-node`](adapters/clerk-node.md)             | `@clerk/backend`'s `authenticateRequest()`                      |
| WorkOS      | [`@priemskiyyy/anchor-workos-node`](adapters/workos-node.md)           | `@workos-inc/node`'s `loadSealedSession()` and `authenticate()` |

Each maps a session as its client adapter does, so one user is one principal on both sides. Auth.js has no server adapter yet: next-auth 4 exports no request-scoped read over a plain `Request`, and its server read answers `null` for a forged token, a throwing callback and a failing database alike, so it cannot tell no session from a failure.

## Write a server adapter

A server adapter is `{ name, native, read }`. `read({ url, method, headers, responseHeaders, signal })` answers a session under the client's `SessionAnswer` contract. It sets whatever the response must carry on `responseHeaders`, appending each `Set-Cookie`, never changes the request's own `headers`, and holds nothing between requests:

```ts
import type { ServerSessionAdapter } from "@priemskiyyy/anchor-server";

type SessionStoreLike = {
  findSession: (
    cookie: string | null,
  ) => Promise<{ userId: string; name: string } | null>;
};

export const sessionStore = ({
  sdk,
}: {
  sdk: SessionStoreLike;
}): ServerSessionAdapter<{ name: string }, SessionStoreLike> => ({
  name: "session-store",
  native: sdk,
  read: async ({ headers }) => {
    const session = await sdk.findSession(headers.get("cookie"));

    if (session === null) {
      return { status: "signed-out" };
    }

    return {
      status: "signed-in",
      principal: {
        authority: "https://app.example.com",
        subject: session.userId,
        tenant: null,
      },
      user: { name: session.name },
      context: null,
      guest: false,
      impersonated: false,
    };
  },
});
```

Answer `signed-out` only on the provider's positive word, and throw when it cannot tell: the state is then `unavailable`. `getRequestSession` checks every answer as the client's Anchor does, so an answer outside the contract is `unavailable` with `INVALID_ANSWER`.

`@priemskiyyy/anchor-server/testing` holds the conformance suite every server adapter passes, as `testSessionAdapter` does for client adapters:

```ts
import { testServerSessionAdapter } from "@priemskiyyy/anchor-server/testing";

testServerSessionAdapter({
  name: "my-provider-node",
  createFixture: () => ({
    adapter: myProvider({ sdk: server }),
    native: server,
    signIn: async (name) => ({
      headers: await signInAndGetCookie(server, name),
      subject: name,
    }),
    signOut: async (headers) => endSessionOf(server, headers),
  }),
});
```

It checks that a request without credentials is signed out, a session is signed in as the subject the provider gave its user, concurrent requests never see each other's session, a session ended elsewhere is signed out rather than unavailable, one request read twice answers the same principal, and the request's own headers stay as they were. Its requests ask for `https://app.example.com/` unless the fixture names another `url`. `vitest` is an optional peer of this entry. See [testing](testing.md).
