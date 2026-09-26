import { afterEach, expect, test, vi } from "vitest";

import { createMockAdapter } from "src/mock/createMockAdapter";
import type { AnchorDiagnosticEvent } from "src/types/AnchorDiagnosticEvent";
import type { SessionObserver } from "src/types/SessionObserver";
import { Anchor } from "src/utils/Anchor";
import { signedIn, signedOut, tick } from "src/utils/answers.fixture";
import type { User } from "src/utils/answers.fixture";

afterEach(() => {
  vi.useRealTimers();
});

const createHeld = () => {
  const mock = createMockAdapter<User>({ hold: { read: true } });
  const anchor = new Anchor({ adapter: mock.adapter });

  return { mock, anchor };
};

const record = (anchor: Anchor<User, unknown, never>) => {
  const events: AnchorDiagnosticEvent[] = [];

  anchor.diagnostics.events.subscribe((event) => events.push(event));

  return events;
};

test("start is idempotent: concurrent and repeated starts share one open, one first read and one promise", async () => {
  const { mock, anchor } = createHeld();
  const first = anchor.start();
  const second = anchor.start();

  expect(second).toBe(first);
  expect(mock.sessions).toHaveLength(1);
  expect(mock.reads).toHaveLength(1);

  mock.reads[0]?.settle(signedIn("ada"));
  await first;

  expect(anchor.start()).toBe(first);
  expect(mock.sessions).toHaveLength(1);
});

test("start resolves at the first known state, and a push can be that state before the first read lands", async () => {
  const { mock, anchor } = createHeld();
  const started = vi.fn();

  anchor.start().then(started);
  await tick();

  expect(started).not.toHaveBeenCalled();
  expect(anchor.diagnostics.get().state).toBe("starting");

  mock.push(signedIn("ada"));
  await tick();

  expect(started.mock.calls).toEqual([[undefined]]);
  expect(anchor.session.get().status).toBe("signed-in");
  expect(anchor.diagnostics.get().state).toBe("started");
});

test("a first read that fails leaves the state unavailable with READ_FAILED, and start still resolves", async () => {
  const { mock, anchor } = createHeld();
  const started = anchor.start();
  const offline = new TypeError("fetch failed");

  mock.reads[0]?.fail(offline);
  await started;

  expect(anchor.session.get()).toEqual({
    status: "unavailable",
    error: expect.objectContaining({ code: "READ_FAILED", cause: offline }),
  });
});

test("a first read that outlives the timeout is unavailable with TIMEOUT, and its signal aborts", async () => {
  vi.useFakeTimers();

  const mock = createMockAdapter<User>({ hold: { read: true } });
  const anchor = new Anchor({ adapter: mock.adapter, timeout: 500 });
  const started = anchor.start();

  vi.advanceTimersByTime(500);
  await started;

  expect(anchor.session.get()).toEqual({
    status: "unavailable",
    error: expect.objectContaining({
      code: "TIMEOUT",
      message: "The read took longer than 500 milliseconds.",
    }),
  });
  expect(mock.reads[0]?.context.signal.aborted).toBe(true);
});

test("a first answer outside the contract is unavailable with INVALID_ANSWER", async () => {
  const { mock, anchor } = createHeld();
  const started = anchor.start();

  // @ts-expect-error An adapter written in JavaScript can answer anything.
  mock.reads[0]?.settle({ ...signedIn("ada"), guest: undefined });
  await started;

  expect(anchor.session.get()).toEqual({
    status: "unavailable",
    error: expect.objectContaining({ code: "INVALID_ANSWER" }),
  });
});

test("the next push or successful read replaces unavailable", async () => {
  const { mock, anchor } = createHeld();
  const started = anchor.start();

  mock.reads[0]?.fail(new Error("offline"));
  await started;

  mock.push(signedIn("ada"));

  expect(anchor.session.get().status).toBe("signed-in");

  const synced = anchor.sync();

  mock.reads[1]?.settle(signedOut);
  await synced;

  expect(anchor.session.get()).toEqual({ status: "signed-out" });
});

test("an adapter that fails to open rejects start with START_FAILED, leaves the state initializing, and a later start opens again", async () => {
  const failure = new Error("not initialized");

  const onOpen = vi.fn<() => void>(() => {
    throw failure;
  });

  const mock = createMockAdapter<User>({ answer: signedIn("ada"), onOpen });
  const anchor = new Anchor({ adapter: mock.adapter });

  await expect(anchor.start()).rejects.toMatchObject({
    code: "START_FAILED",
    cause: failure,
  });
  expect(anchor.session.get()).toEqual({ status: "initializing" });
  expect(anchor.diagnostics.get().state).toBe("idle");

  onOpen.mockImplementation(() => {});
  await anchor.start();

  expect(anchor.session.get().status).toBe("signed-in");
  expect(mock.sessions).toHaveLength(1);
});

test("a push from inside open waits for open to return, and one from an open that then fails is never committed", async () => {
  const emitting = createMockAdapter<User>({
    hold: { read: true },
    onOpen: (observer) => observer.session(signedIn("ada")),
  });

  const anchor = new Anchor({ adapter: emitting.adapter });
  const started = anchor.start();

  expect(anchor.session.get().status).toBe("signed-in");
  await started;

  const failing = createMockAdapter<User>({
    onOpen: (observer) => {
      observer.session(signedIn("ada"));

      throw new Error("failed after emitting");
    },
  });

  const rolledBack = new Anchor({ adapter: failing.adapter });

  await expect(rolledBack.start()).rejects.toMatchObject({
    code: "START_FAILED",
  });
  expect(rolledBack.session.get()).toEqual({ status: "initializing" });
});

test("the observer of an open that failed stays silent after a later start succeeds", async () => {
  const observers: SessionObserver<User>[] = [];
  let failing = true;

  const mock = createMockAdapter<User>({
    answer: signedIn("ada"),
    onOpen: (observer) => {
      observers.push(observer);

      if (!failing) {
        return;
      }

      throw new Error("not yet");
    },
  });

  const anchor = new Anchor({ adapter: mock.adapter });
  const events = record(anchor);

  await expect(anchor.start()).rejects.toMatchObject({ code: "START_FAILED" });

  failing = false;
  await anchor.start();
  observers[0]?.session(signedIn("grace"));

  expect(anchor.session.get()).toMatchObject({
    session: { principal: { subject: "ada" } },
  });
  expect(events.at(-1)).toMatchObject({
    type: "callback ignored",
    context: { callback: "session" },
  });
});

test("dispose during start rejects the start with DISPOSED, aborts the read, and its late answer changes nothing", async () => {
  const { mock, anchor } = createHeld();
  const started = anchor.start();

  anchor.dispose();

  await expect(started).rejects.toMatchObject({ code: "DISPOSED" });
  expect(mock.reads[0]?.context.signal.aborted).toBe(true);

  mock.reads[0]?.settle(signedIn("ada"));
  await tick();

  expect(anchor.session.get()).toEqual({ status: "initializing" });
});

test("dispose disposes the adapter session once, keeps the last state and calls no listener again", async () => {
  const mock = createMockAdapter<User>({ answer: signedIn("ada") });
  const anchor = new Anchor({ adapter: mock.adapter });

  await anchor.start();

  const listener = vi.fn();
  const last = anchor.session.get();

  anchor.session.subscribe(listener);
  anchor.dispose();
  anchor.dispose();
  mock.push(signedIn("grace"));

  expect(mock.sessions.map(({ disposeCount }) => disposeCount)).toEqual([1]);
  expect(anchor.session.get()).toBe(last);
  expect(listener).not.toHaveBeenCalled();
});

test("a callback after dispose is ignored and recorded, never committed", async () => {
  const mock = createMockAdapter<User>({ answer: signedIn("ada") });
  const anchor = new Anchor({ adapter: mock.adapter });
  const seen: AnchorDiagnosticEvent[] = [];

  await anchor.start();

  const observer = mock.sessions[0]?.observer;

  anchor.diagnostics.events.subscribe((event) => seen.push(event));
  anchor.dispose();
  observer?.session(signedOut);
  observer?.invalidate();

  expect(anchor.session.get().status).toBe("signed-in");
  expect(mock.reads).toHaveLength(1);
  expect(seen.map(({ type }) => type)).toEqual(["anchor disposed"]);
});

test("an adapter session whose dispose throws or rejects is reported, never thrown into the host", async () => {
  const reported: Array<() => void> = [];

  vi.spyOn(globalThis, "queueMicrotask").mockImplementation((task) => {
    reported.push(task);
  });

  const failure = new Error("cleanup failed");
  const mock = createMockAdapter<User>({ answer: signedIn("ada") });

  const anchor = new Anchor({
    adapter: {
      ...mock.adapter,
      open: (observer) => ({
        ...mock.adapter.open(observer),
        dispose: () => {
          throw failure;
        },
      }),
    },
  });

  await anchor.start();

  expect(() => anchor.dispose()).not.toThrow();
  expect(
    reported.some((task) => {
      try {
        task();
      } catch (error) {
        return error === failure;
      }

      return false;
    }),
  ).toBe(true);
});

test("sync reads again and resolves once a read that started after the call settled", async () => {
  const { mock, anchor } = createHeld();
  const started = anchor.start();

  mock.reads[0]?.settle(signedIn("ada"));
  await started;

  const synced = vi.fn();

  anchor.sync().then(synced);

  expect(mock.reads).toHaveLength(2);

  mock.change(signedIn("grace"));
  mock.reads[1]?.settle();
  await tick();

  expect(synced.mock.calls).toEqual([[undefined]]);
  expect(anchor.session.get()).toMatchObject({
    session: { principal: { subject: "grace" } },
  });
});

test("syncs made while a read runs share one queued read that starts when the running one settles", async () => {
  const { mock, anchor } = createHeld();
  const started = anchor.start();
  const first = anchor.sync();
  const second = anchor.sync();

  expect(mock.reads).toHaveLength(1);
  expect(anchor.diagnostics.get().operations).toEqual([
    { kind: "read", queued: false, waiters: 0 },
    { kind: "read", queued: true, waiters: 2 },
  ]);

  mock.reads[0]?.settle(signedIn("ada"));
  await started;

  expect(mock.reads).toHaveLength(2);

  mock.reads[1]?.settle(signedIn("ada"));

  await expect(first).resolves.toBeUndefined();
  await expect(second).resolves.toBeUndefined();
  expect(mock.reads).toHaveLength(2);
});

test("a later read that fails rejects sync with READ_FAILED and leaves the session alone", async () => {
  const { mock, anchor } = createHeld();
  const started = anchor.start();

  mock.reads[0]?.settle(signedIn("ada"));
  await started;

  const state = anchor.session.get();
  const synced = anchor.sync();

  mock.reads[1]?.fail(new TypeError("fetch failed"));

  await expect(synced).rejects.toMatchObject({ code: "READ_FAILED" });
  expect(anchor.session.get()).toBe(state);
});

test("a sync whose read was superseded by a newer push resolves, whatever the read answered", async () => {
  const { mock, anchor } = createHeld();
  const started = anchor.start();

  mock.reads[0]?.settle(signedIn("ada"));
  await started;

  const synced = anchor.sync();

  mock.push(signedIn("grace"));
  mock.reads[1]?.fail(new Error("offline"));

  await expect(synced).resolves.toBeUndefined();
  expect(anchor.session.get()).toMatchObject({
    session: { principal: { subject: "grace" } },
  });
});

test("invalidations during a read coalesce into one more read, and a failed background read is only a diagnostic", async () => {
  const { mock, anchor } = createHeld();
  const events = record(anchor);
  const started = anchor.start();

  mock.reads[0]?.settle(signedIn("ada"));
  await started;

  mock.invalidate();
  mock.invalidate();
  mock.invalidate();

  expect(mock.reads).toHaveLength(2);

  mock.reads[1]?.fail(new Error("offline"));
  await tick();

  expect(mock.reads).toHaveLength(3);

  mock.reads[2]?.settle(signedIn("ada"));
  await tick();

  expect(mock.reads).toHaveLength(3);
  expect(anchor.session.get().status).toBe("signed-in");
  expect(events.filter(({ type }) => type === "read failed")).toHaveLength(1);
});

test("background reads never return the state to initializing", async () => {
  const { mock, anchor } = createHeld();
  const statuses: string[] = [];

  anchor.session.subscribe(() => statuses.push(anchor.session.get().status));

  const started = anchor.start();

  mock.reads[0]?.settle(signedIn("ada"));
  await started;

  const synced = anchor.sync();

  mock.reads[1]?.settle(signedIn("ada"));
  await synced;

  expect(statuses).toEqual(["signed-in"]);
});
