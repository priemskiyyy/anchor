# The Session Lab's server

A small Node server that reads each request's session on the server with [`@priemskiyyy/anchor-server`](../../packages/server) and the Better Auth server adapter, [`@priemskiyyy/anchor-better-auth-node`](../../packages/adapters/better-auth-node), over an in-process Better Auth server on a memory database. It renders a page with the session and its hydration, and passes Better Auth's own headers, such as a deleted session cookie, on with every response. Node's own `http`, no framework.

```sh
pnpm install
pnpm build
pnpm --filter example-server dev
```

`dev` builds the server with Vite's SSR build and runs the bundle, as Trace's server example does, then serves `http://127.0.0.1:4320/`. Sign up as a visitor from the page and sign out again; the users live in memory until the server stops.

## How it fits together

| File                          | Role                                                                                                                                                                  |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/createAuthServer.ts`     | The application's own Better Auth, on a memory database. Anchor never creates or configures it.                                                                       |
| `src/createSessionHandler.ts` | The one handler, in the Fetch API's shape: `GET /` reads the request with `getRequestSession`, and the two forms sign a visitor up or out through Better Auth itself. |
| `src/renderSessionPage.ts`    | The page, with `getSessionHydration`'s allowlist (the name, nothing else) escaped into a JSON script.                                                                 |
| `src/main.ts`                 | Listens on port 4320 and turns Node's requests into `Request`s and back.                                                                                              |

Each request builds its own read and holds nothing between requests, so one visitor's session can never answer another's. A provider that cannot tell answers `unavailable` with status 503, never signed out. A form posted from another site is refused with 403.

## Tests

`pnpm vitest run --project example-server` drives the handler in-process, against a real Better Auth server on a memory database: a request without a cookie is signed out, with Better Auth's `cache-control` passed on; a sign-up's cookie reads as that visitor, and the hydration carries the name and no token or email; two visitors read at the same time see only their own sessions; a cookie whose session ended elsewhere reads as signed out and its deletion is passed on; the sign-out form ends only that visitor's session; a name cannot add markup to the page or the hydration; and a cross-site post is refused.
