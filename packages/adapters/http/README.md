# @priemskiyyy/anchor-http

Your own backend as an Anchor session provider, through your own client. You give the adapter the functions that read the session, mint each token and end the session, and your client keeps everything it already owns: the address, cookies, authentication, retries and response validation. The adapter maps their answers onto the session contract, binds every token to the session that asked for it, and observes nothing.

Version 0.1.1 is an initial preview. APIs may change before 1.0. See the [verification limits](https://github.com/priemskiyyy/anchor/blob/main/docs/verification.md) before adopting an adapter.

## Installation

```sh
pnpm add @priemskiyyy/anchor @priemskiyyy/anchor-http
```

## Create an Anchor

```ts
import { Anchor } from "@priemskiyyy/anchor";
import { http } from "@priemskiyyy/anchor-http";

export const anchor = new Anchor({
  adapter: http({
    authority: "https://api.example.com",
    read: async ({ signal }) => {
      const response = await fetch("/api/session", {
        credentials: "include",
        signal,
      });

      if (response.status === 401) {
        return null;
      }

      if (!response.ok) {
        throw new Error(`The session endpoint answered ${response.status}.`);
      }

      const { user, session } = SessionSchema.parse(await response.json());

      return { subject: user.id, user, context: session.id };
    },
    end: async ({ session, signal }) => {
      const response = await fetch("/api/logout", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ session: session.context }),
        signal,
      });

      if (!response.ok) {
        throw new Error(`The logout endpoint answered ${response.status}.`);
      }
    },
    tokens: {
      realtime: async ({ signal }) => {
        const { token, userId } = TokenSchema.parse(
          await api.get("/api/realtime-token", { signal }),
        );

        return { value: token, subject: userId };
      },
    },
  }),
});

await anchor.start();
```

After a sign-in or sign-out flow of your own, call `anchor.sync()`.

## Options

| Option      | Type                                        | Default  | What it does                                                              |
| ----------- | ------------------------------------------- | -------- | ------------------------------------------------------------------------- |
| `authority` | `string`                                    | required | Names your backend, the authority of every principal, such as its origin. |
| `read`      | `({ signal }) => HttpSessionAnswer \| null` | required | Reads the current session, as described below.                            |
| `end`       | `({ session, signal }) => void`             | none     | Ends exactly the session named, on your server.                           |
| `tokens`    | `Record<string, (request) => HttpToken>`    | none     | The token profiles, each the function that mints it.                      |

Each function may return its answer or a promise of it. Pass `signal` on: it aborts at Anchor's timeout and on disposal.

## Capabilities

| Capability           | http                                                                       |
| -------------------- | -------------------------------------------------------------------------- |
| Observation          | None: call `anchor.sync()` after a sign-in or sign-out flow.               |
| Token profiles       | Any: each is a function of yours, bound to the session by its `subject`.   |
| Forced refresh       | Passed on as `forceRefresh`.                                               |
| End                  | Local and remote, once your `end` resolves.                                |
| Navigation after end | Never.                                                                     |
| Runtimes             | Anywhere your client runs: browsers, React Native, Node and edge runtimes. |

## How a session is mapped

`principal.authority` is the `authority` option, and everything else comes from `read`. `read` answers `null` only on your server's positive word that there is no session, such as a 401. When it cannot tell, a network failure or a 5xx, it throws: the first state is then `unavailable` and a later read keeps the session, never signing anyone out on a guess. A session is:

| Field          | Type               | Default  | Meaning                                                                                                         |
| -------------- | ------------------ | -------- | --------------------------------------------------------------------------------------------------------------- |
| `subject`      | `string`           | required | Your server's stable id of the user.                                                                            |
| `user`         | `TUser`            | required | Plain data the session carries; its type is the session's user type.                                            |
| `tenant`       | `string \| null`   | `null`   | Your server's tenant partition, when it has them.                                                               |
| `context`      | `string \| null`   | `null`   | A deterministic fingerprint of what else changes permissions: the server's session id, the active organization. |
| `guest`        | `boolean`          | `false`  | An anonymous session.                                                                                           |
| `impersonated` | `boolean`          | `false`  | A session someone else acts in.                                                                                 |
| `action`       | `{ kind } \| null` | `null`   | A step the user must finish, such as `accept-terms`: the state is `action-required`.                            |

Validate the response before you answer: Anchor refuses an answer outside the contract, such as one without a string `subject`, with `INVALID_ANSWER`, but it cannot tell a well-formed wrong answer from a right one.

## Tokens

`session.getToken(profile)` calls that profile's function with `{ profile, forceRefresh, session, signal }`, where `session` is the identity of the session that asked. It answers `{ value, subject, tenant?, context?, kind?, scheme? }`, `kind` defaulting to `access-token` and `scheme` to `null`. `subject` is who your server minted the token for: a cookie authenticates whoever is signed in now, not the session that asked, so a token minted for another subject rejects with `SESSION_CHANGED` and never reaches the old session's work. Answer `tenant` and `context` too, as `read` answers them, when your server knows what it minted for: a token minted after an organization switch or a new login in another tab then rejects with `SESSION_CHANGED` as well, where the subject alone cannot tell. A function that throws rejects with `TOKEN_FAILED` and its error as the `cause`. `forceRefresh` is yours to honor: the adapter invents no refresh semantics.

## Ending the session

`session.end()` calls `end({ session, signal })` with the identity of the session to end, so your server can end exactly that one, and answers `{ local: "completed", remote: "completed", navigation: null }` once it resolves. An `end` that throws rejects with `END_FAILED`, and the session stays signed in until a read says otherwise. Without `end`, `session.end()` rejects with `UNSUPPORTED`.

## What Anchor does not normalize

Everything your client already owns stays with it: the address, cookies and CSRF protection, authentication and sign-in flows, retries and backoff, response validation, and how your server refreshes or revokes what it issues. Anchor calls your backend only through `read`, the token functions and `end`, and only when it is asked to read, mint or end.

## Behavior

- The factory is cold: creating the adapter calls none of your functions.
- `native` is `null`: there is no SDK behind the adapter.
- The adapter holds no state and installs no listener; `dispose()` has nothing to remove.
- A token is minted once per call: there is no cache, retry or queue in the adapter. Anchor shares one request between concurrent callers of the same profile and the same `forceRefresh`.

## Tests

The tests run against an in-process fake backend client injected through the options, including the conformance suite. No request is sent over a network from this repository.

## License

MIT
