# @priemskiyyy/anchor-server

Request-scoped session reads for Anchor. One request goes in; its session state and the headers the provider wants set on the response come out, such as a refreshed session cookie. Each read stands alone: no observer, no Anchor shared between requests, and a provider that cannot tell answers `unavailable`, never `signed-out`. What reaches the page goes through an explicit allowlist, and the client's Anchor never takes it for evidence.

## Installation

```sh
pnpm add @priemskiyyy/anchor @priemskiyyy/anchor-server
```

Then a server adapter, such as `betterAuth` from `@priemskiyyy/anchor-better-auth-node`.

## Read a request

```ts
import {
  getRequestSession,
  getSessionHydration,
} from "@priemskiyyy/anchor-server";
import { betterAuth } from "@priemskiyyy/anchor-better-auth-node";

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

Pass on `headers` in every branch: Better Auth, for one, refreshes and deletes cookies through them.

## The state

`state` has the client's shape without the client's powers:

| `status`          | Carries                                                                                                                                                                                           |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `signed-out`      | nothing: the provider said there is no session                                                                                                                                                    |
| `signed-in`       | `session`: `principal`, `user` (a frozen copy), `guest`, `impersonated`                                                                                                                           |
| `action-required` | `action` and `session`: the user must finish a step first                                                                                                                                         |
| `unavailable`     | `error`: `READ_FAILED` with the provider's error as its `cause`, `TIMEOUT`, `INVALID_ANSWER`, or the code of an `AnchorError` the adapter threw, such as Clerk's `INTERACTION_REQUIRED` handshake |

A request's session has no `key`, no `getToken` and no `end`: those belong to the Anchor in the browser, which reads its own provider.

## Hydration

`getSessionHydration(state, { select })` answers what of the session may go on the page: its status, the `kind` of a required action, and exactly what `select` picks. It never carries a token, a cookie, SDK state or a provider error, and an `unavailable` hydration carries no error at all. Render it while the client's Anchor is still `initializing`:

<!-- snippet: fragment -->

```ts
const getDisplayName = (
  state: RegisteredSessionState,
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

The Anchor never starts from the hydration: a serialized browser session is not evidence of who is signed in, so the first state still comes from the client's provider.

## Options

| Option    | Default  | What it does                                                                     |
| --------- | -------- | -------------------------------------------------------------------------------- |
| `adapter` | required | The server adapter, such as `betterAuth({ sdk: auth })`.                         |
| `timeout` | `10000`  | Milliseconds the read may take before the state is `unavailable` with `TIMEOUT`. |

## Writing a server adapter

A server adapter is `{ name, native, read }`, where `read({ url, method, headers, responseHeaders, signal })` answers a session under the client's `SessionAnswer` contract. It sets whatever the response must carry, such as a refreshed or deleted cookie, on `responseHeaders`, appending each `Set-Cookie`, and never changes the request's own `headers`. It holds nothing between requests. `getRequestSession` checks every answer as the client's Anchor does, so an answer outside the contract is `unavailable` with `INVALID_ANSWER`.

## Testing a server adapter

`@priemskiyyy/anchor-server/testing` holds the conformance suite every server adapter passes, as `testSessionAdapter` does for client adapters. Give it a fixture over a fake or in-process server:

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

It checks that a request without credentials is signed out, a session is signed in as the subject the provider gave its user, concurrent requests never see each other's session, a session ended elsewhere is signed out rather than unavailable, one request read twice answers the same principal, and the request's own headers stay as they were. Its requests ask for `https://app.example.com/` unless the fixture names another `url`. `vitest` is an optional peer of this entry.

## Behavior

- Concurrent requests never see each other's session or headers, whatever order their reads settle in.
- The headers the provider set reach `headers` whatever the read answers: a cookie rotated before a read failed is still set, so the browser keeps the session it would otherwise lose.
- A read that outlives `timeout` aborts its `signal` and answers `unavailable`; a late answer changes nothing, and neither do headers it sets late.
- An invalid `timeout` rejects with `INVALID_CONFIGURATION` before anything is read.

## Tests

The reads run against an in-process fake server adapter, including request isolation with reads settled in reverse order. The Better Auth server adapter runs against a real Better Auth server on a memory database.

## License

MIT
