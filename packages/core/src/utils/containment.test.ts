import { expect, test, vi } from "vitest";

import { createMockAdapter } from "src/mock/createMockAdapter";
import type { AnchorDiagnosticEvent } from "src/types/AnchorDiagnosticEvent";
import type { SessionAdapter } from "src/types/SessionAdapter";
import { Anchor } from "src/utils/Anchor";
import { signedIn, signedOut, tick } from "src/utils/answers.fixture";
import type { User } from "src/utils/answers.fixture";

const collectMicrotasks = () => {
  const tasks: Array<() => void> = [];

  vi.spyOn(globalThis, "queueMicrotask").mockImplementation((task) => {
    tasks.push(task);
  });

  return tasks;
};

test("a subscriber that throws stops neither the other subscribers nor the commit, and the failure is rethrown outside", async () => {
  const tasks = collectMicrotasks();
  const failure = new Error("render failed");
  const mock = createMockAdapter<User>({ answer: signedOut });
  const anchor = new Anchor({ adapter: mock.adapter });
  const after = vi.fn();

  anchor.session.subscribe(() => {
    throw failure;
  });
  anchor.session.subscribe(after);

  const started = anchor.start();

  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await started;

  expect(anchor.session.get()).toEqual({ status: "signed-out" });
  expect(after.mock.calls).toEqual([[]]);
  expect(
    tasks.some((task) => {
      try {
        task();
      } catch (error) {
        return error === failure;
      }

      return false;
    }),
  ).toBe(true);
});

test("an adapter whose read throws synchronously makes the first state unavailable, never a throw from start", async () => {
  const failure = new Error("storage unreadable");

  const adapter: SessionAdapter<User, null, never> = {
    name: "throwing",
    native: null,
    tokens: {},
    open: () => ({
      read: () => {
        throw failure;
      },
    }),
  };

  const anchor = new Anchor({ adapter });

  await expect(anchor.start()).resolves.toBeUndefined();
  expect(anchor.session.get()).toEqual({
    status: "unavailable",
    error: expect.objectContaining({ code: "READ_FAILED", cause: failure }),
  });
});

test("an adapter whose getToken or end throws synchronously rejects the call, never throws it", async () => {
  const failure = new Error("sdk crashed");

  const adapter: SessionAdapter<User, null, "api"> = {
    name: "throwing",
    native: null,
    tokens: { api: {} },
    open: () => ({
      read: () => signedIn("ada"),
      getToken: () => {
        throw failure;
      },
      end: () => {
        throw failure;
      },
    }),
  };

  const anchor = new Anchor({ adapter });

  await anchor.start();

  const state = anchor.session.get();

  if (state.status !== "signed-in") {
    throw new Error("Expected a session.");
  }

  await expect(state.session.getToken("api")).rejects.toMatchObject({
    code: "TOKEN_FAILED",
    cause: failure,
  });
  await expect(state.session.end()).rejects.toMatchObject({
    code: "END_FAILED",
    cause: failure,
  });
});

test("a push outside the contract is ignored and recorded, and the state stays as it was", async () => {
  const mock = createMockAdapter<User>({ answer: signedIn("ada") });
  const anchor = new Anchor({ adapter: mock.adapter });
  const events: AnchorDiagnosticEvent[] = [];

  await anchor.start();

  const state = anchor.session.get();

  anchor.diagnostics.events.subscribe((event) => events.push(event));
  // @ts-expect-error An adapter written in JavaScript can answer anything.
  mock.push({ status: "signed-in", user: { name: "nobody" } });

  expect(anchor.session.get()).toBe(state);
  expect(events).toEqual([
    expect.objectContaining({
      type: "answer invalid",
      context: { operation: "push" },
    }),
  ]);
});

test("a subscriber that disposes the Anchor while it is notified leaves every call settled", async () => {
  const mock = createMockAdapter<User, "api">({
    answer: signedIn("ada"),
    tokens: { api: {} },
    hold: { getToken: true, read: true },
  });

  const anchor = new Anchor({ adapter: mock.adapter });
  const started = anchor.start();

  mock.reads[0]?.settle();
  await started;

  const state = anchor.session.get();

  if (state.status !== "signed-in") {
    throw new Error("Expected a session.");
  }

  const token = state.session.getToken("api");
  const synced = anchor.sync();

  anchor.session.subscribe(() => anchor.dispose());
  mock.push(signedIn("grace"));

  await expect(token).rejects.toMatchObject({ code: "SESSION_CHANGED" });
  await expect(synced).rejects.toMatchObject({ code: "DISPOSED" });
  expect(mock.sessions.map(({ disposeCount }) => disposeCount)).toEqual([1]);
});

test("a subscriber that syncs while it is notified gets a read that starts after the change", async () => {
  const mock = createMockAdapter<User>({
    answer: signedIn("ada"),
    hold: { read: true },
  });

  const anchor = new Anchor({ adapter: mock.adapter });
  const started = anchor.start();
  const syncs: Array<Promise<void>> = [];

  anchor.session.subscribe(() => {
    syncs.push(anchor.sync());
  });

  mock.reads[0]?.settle();
  await started;

  expect(mock.reads).toHaveLength(2);

  mock.reads[1]?.settle();

  await expect(syncs[0]).resolves.toBeUndefined();
});

test("a push from inside read supersedes that read's own answer", async () => {
  const mock = createMockAdapter<User>({ answer: signedIn("ada") });

  const adapter: SessionAdapter<User, { name: string }, never> = {
    ...mock.adapter,
    open: (observer) => {
      const session = mock.adapter.open(observer);

      return {
        ...session,
        read: (context) => {
          observer.session(signedIn("grace"));

          return session.read(context);
        },
      };
    },
  };

  const anchor = new Anchor({ adapter });

  await anchor.start();
  await tick();

  expect(anchor.session.get()).toMatchObject({
    session: { principal: { subject: "grace" } },
  });
});

test("an adapter whose session has no read fails the first read as READ_FAILED", async () => {
  const adapter: SessionAdapter<User, null, never> = {
    name: "broken",
    native: null,
    tokens: {},
    // @ts-expect-error An adapter written in JavaScript can return anything.
    open: () => ({}),
  };

  const anchor = new Anchor({ adapter });

  await anchor.start();

  expect(anchor.session.get()).toMatchObject({
    status: "unavailable",
    error: { code: "READ_FAILED" },
  });
});
