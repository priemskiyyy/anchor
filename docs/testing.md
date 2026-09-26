---
description: "Test code that reads the session, mints tokens and ends sessions with Anchor's mock adapter: hold and settle every call, change the provider with or without telling Anchor, and run the conformance suites for adapters you write."
---

# Testing

`createMockAdapter` from `@priemskiyyy/anchor/mock` is an adapter for tests. It records every call, can hold reads, token requests and endings until the test settles them, and models a provider whose state the test changes, with or without telling Anchor. It behaves as a correct adapter by default: it mints and ends only for the session a request names.

## Drive a race

```ts
import { Anchor } from "@priemskiyyy/anchor";
import type { SessionAnswer } from "@priemskiyyy/anchor";
import { createMockAdapter } from "@priemskiyyy/anchor/mock";
import { expect, test } from "vitest";

type User = { name: string };

const signedInAs = (name: string): SessionAnswer<User> => ({
  status: "signed-in",
  principal: {
    authority: "https://id.example.com",
    subject: name,
    tenant: null,
  },
  user: { name },
  context: null,
  guest: false,
  impersonated: false,
});

test("a token requested for Ada never resolves for Grace", async () => {
  const mock = createMockAdapter<User, "api">({
    answer: signedInAs("ada"),
    tokens: { api: {} },
    hold: { getToken: true },
  });

  const anchor = new Anchor({ adapter: mock.adapter });

  await anchor.start();

  const state = anchor.session.get();

  if (state.status !== "signed-in") {
    throw new Error("Ada should be signed in.");
  }

  const token = state.session.getToken("api");

  mock.push(signedInAs("grace"));

  await expect(token).rejects.toMatchObject({ code: "SESSION_CHANGED" });
  expect(
    mock.tokens.map(({ request }) => request.session.principal.subject),
  ).toEqual(["ada"]);

  anchor.dispose();
});
```

## Drive a failure

```ts
import { Anchor } from "@priemskiyyy/anchor";
import { createMockAdapter } from "@priemskiyyy/anchor/mock";
import { expect, test } from "vitest";

test("a provider that cannot be reached is unavailable until a read gets through", async () => {
  const mock = createMockAdapter<{ name: string }>({
    answer: {
      status: "signed-in",
      principal: {
        authority: "https://id.example.com",
        subject: "ada",
        tenant: null,
      },
      user: { name: "Ada" },
      context: null,
      guest: false,
      impersonated: false,
    },
    hold: { read: true },
  });

  const anchor = new Anchor({ adapter: mock.adapter });
  const started = anchor.start();

  mock.reads[0]?.fail(new Error("offline"));
  await started;

  expect(anchor.session.get()).toMatchObject({
    status: "unavailable",
    error: { code: "READ_FAILED" },
  });

  const synced = anchor.sync();

  mock.reads[1]?.settle();
  await synced;

  expect(anchor.session.get()).toMatchObject({ status: "signed-in" });

  anchor.dispose();
});
```

## The mock

| Option     | What it does                                                                                                            |
| ---------- | ----------------------------------------------------------------------------------------------------------------------- |
| `name`     | The adapter's name, `mock` by default.                                                                                  |
| `answer`   | What the provider holds at first and what an unheld read answers; `signed-out` by default.                              |
| `tokens`   | The token profiles the mock declares, by name, such as `{ api: {} }`.                                                   |
| `hold`     | Calls that wait for the test's `settle` or `fail`: `true` for every kind, or `{ read, getToken, end }`.                 |
| `getToken` | `false` leaves `getToken` out of every session, so tokens reject with `UNSUPPORTED`.                                    |
| `end`      | `false` leaves `end` out of every session, so endings reject with `UNSUPPORTED`.                                        |
| `onOpen`   | Runs inside every `open` with the observer. Throwing fails the start; pushing models an SDK that emits on registration. |

`createMockAdapter` returns:

| Member           | What it is                                                                                                                                     |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `adapter`        | The adapter to give the Anchor. Its `native` is `{ name }`.                                                                                    |
| `reads`          | Every read, with its `context` and `settle(answer?)` and `fail(error)`. An unanswered `settle()` answers what the provider holds now.          |
| `tokens`         | Every token request, with its `request` and `settle(token?)` and `fail(error)`. The default token names the profile and the request's subject. |
| `ends`           | Every ending, with its `request` and `settle(result?)` and `fail(error)`. The default signs the provider out when it holds the session named.  |
| `sessions`       | Every opened session, with its `observer` and `disposeCount`.                                                                                  |
| `current()`      | What the provider holds now.                                                                                                                   |
| `push(answer)`   | The provider changes and tells every open observer.                                                                                            |
| `change(answer)` | The provider changes without telling anyone, as an SDK that emits nothing; a `sync()` sees it.                                                 |
| `invalidate()`   | Tells every open observer that something changed, without saying what.                                                                         |

The mock is well behaved by default and deliberately able to misbehave: it never guards itself after disposal and never times out on its own, so a held call that the test never settles runs into the Anchor's `timeout`. Dispose each Anchor at the end of its test.

## Components

Every binding takes the Anchor as a prop of its provider, so a component test renders the provider over an Anchor on the mock and needs nothing mocked at the module level; the bindings' own tests do exactly that. The provider's type is the Anchor type your application registers, so the Anchor a test gives it must be assignable to that type, and the mock's adapter has the mock's own `native`, `{ name }`. Where nothing is registered, as in the bindings' own tests, an Anchor over `createMockAdapter<unknown, string>()` is the type the provider takes.

## Adapters and server adapters

`testSessionAdapter({ name, createFixture })` from `@priemskiyyy/anchor/testing` is the conformance suite every client adapter passes, over a fixture that drives the adapter's fake SDK. It checks that the factory is cold and the adapter names itself, that `native` is the SDK the fixture passed, that an initial signed-out and signed-in state resolve, that a sign-in and a sign-out after the start are observed, that every answer is within the contract, that each declared profile mints a token for the current session, that the adapter refuses to mint for a session its SDK no longer holds, that ending completes locally or says it cannot tell, and that `dispose()` removes every listener. It cannot prove refresh, persistence, remote revocation or event ordering against a provider; an adapter tests those itself. See [writing an adapter](writing-an-adapter.md).

`testServerSessionAdapter` from `@priemskiyyy/anchor-server/testing` does the same for server adapters. See [server and SSR](server-rendering.md#write-a-server-adapter).

Both entries need Vitest, an optional peer of the package.
