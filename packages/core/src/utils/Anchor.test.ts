import { expect, test, vi } from "vitest";

import { createMockAdapter } from "src/mock/createMockAdapter";
import { Anchor } from "src/utils/Anchor";
import { signedIn } from "src/utils/answers.fixture";
import type { User } from "src/utils/answers.fixture";
import { INITIALIZING_SESSION_STATE } from "src/utils/constants/states";

test("constructing an Anchor opens nothing, reads nothing and reads initializing", () => {
  const onOpen = vi.fn();
  const mock = createMockAdapter<User>({ onOpen });
  const anchor = new Anchor({ adapter: mock.adapter });

  expect(anchor.session.get()).toBe(INITIALIZING_SESSION_STATE);
  expect(onOpen.mock.calls).toEqual([]);
  expect(mock.reads).toEqual([]);
  expect(anchor.diagnostics.get()).toEqual({
    state: "idle",
    adapter: { name: "mock" },
    session: {
      status: "initializing",
      key: null,
      principal: null,
      generation: 0,
    },
    operations: [],
  });
});

test("native is the adapter's own SDK, available before start", () => {
  const mock = createMockAdapter<User>();
  const anchor = new Anchor({ adapter: mock.adapter });

  expect(anchor.native).toBe(mock.adapter.native);
});

test.each([0, -1, 1.5, 2_147_483_648, Number.NaN])(
  "a timeout of %s milliseconds is refused by the constructor with INVALID_CONFIGURATION",
  (timeout) => {
    const mock = createMockAdapter<User>();

    expect(() => new Anchor({ adapter: mock.adapter, timeout })).toThrow(
      expect.objectContaining({
        code: "INVALID_CONFIGURATION",
        message:
          "The timeout must be a whole number of milliseconds from 1 to 2147483647.",
      }),
    );
  },
);

test("the members stay bound when destructured", async () => {
  const mock = createMockAdapter<User>({ answer: signedIn("ada") });

  const { start, sync, dispose, session } = new Anchor({
    adapter: mock.adapter,
  });

  await start();
  await sync();

  expect(session.get().status).toBe("signed-in");

  dispose();

  expect(mock.sessions.map(({ disposeCount }) => disposeCount)).toEqual([1]);
});

test("start resolves with the first state, and the state and its session are frozen", async () => {
  const mock = createMockAdapter<User>({ answer: signedIn("ada") });
  const anchor = new Anchor({ adapter: mock.adapter });

  await anchor.start();

  const state = anchor.session.get();

  expect(state).toEqual({
    status: "signed-in",
    session: {
      key: expect.any(String),
      principal: {
        authority: "https://login.example.com",
        subject: "ada",
        tenant: null,
      },
      user: { name: "ada" },
      guest: false,
      impersonated: false,
      getToken: expect.any(Function),
      end: expect.any(Function),
    },
  });
  expect(Object.isFrozen(state)).toBe(true);
  expect(state.status === "signed-in" && Object.isFrozen(state.session)).toBe(
    true,
  );
  expect(
    state.status === "signed-in" && Object.isFrozen(state.session.user),
  ).toBe(true);
});

test("sync before start is refused with NOT_STARTED, and every operation after dispose with DISPOSED", async () => {
  const mock = createMockAdapter({
    answer: signedIn("ada"),
    tokens: { api: {} },
  });

  const anchor = new Anchor({ adapter: mock.adapter });

  await expect(anchor.sync()).rejects.toMatchObject({ code: "NOT_STARTED" });

  await anchor.start();

  const state = anchor.session.get();

  anchor.dispose();
  anchor.dispose();

  if (state.status !== "signed-in") {
    throw new Error("Expected a session.");
  }

  await expect(anchor.start()).rejects.toMatchObject({ code: "DISPOSED" });
  await expect(anchor.sync()).rejects.toMatchObject({ code: "DISPOSED" });
  await expect(state.session.getToken("api")).rejects.toMatchObject({
    code: "DISPOSED",
  });
  await expect(state.session.end()).rejects.toMatchObject({ code: "DISPOSED" });
  expect(mock.tokens).toEqual([]);
  expect(mock.ends).toEqual([]);
});

test("disposing an Anchor that never started is quiet and final", async () => {
  const mock = createMockAdapter<User>();
  const anchor = new Anchor({ adapter: mock.adapter });

  anchor.dispose();

  await expect(anchor.start()).rejects.toMatchObject({ code: "DISPOSED" });
  expect(mock.sessions).toEqual([]);
  expect(anchor.diagnostics.get().state).toBe("disposed");
});
