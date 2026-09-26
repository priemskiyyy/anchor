import { expect, test, vi } from "vitest";

import { createMockAdapter } from "src/mock/createMockAdapter";
import type { AnchorDiagnosticEvent } from "src/types/AnchorDiagnosticEvent";
import type { AnchorSnapshot } from "src/types/AnchorSnapshot";
import { Anchor } from "src/utils/Anchor";
import { signedIn, tick } from "src/utils/answers.fixture";
import type { User } from "src/utils/answers.fixture";

const isDeepFrozen = (value: unknown): boolean => {
  if (typeof value !== "object" || value === null) {
    return true;
  }

  return Object.isFrozen(value) && Object.values(value).every(isDeepFrozen);
};

test("the snapshot follows the lifecycle and the session and lists the calls in flight, frozen throughout", async () => {
  const mock = createMockAdapter<User, "api">({
    answer: signedIn("ada"),
    tokens: { api: {} },
    hold: true,
  });

  const anchor = new Anchor({ adapter: mock.adapter });
  const started = anchor.start();

  expect(anchor.diagnostics.get()).toEqual({
    state: "starting",
    adapter: { name: "mock" },
    session: {
      status: "initializing",
      key: null,
      principal: null,
      generation: 0,
    },
    operations: [{ kind: "read", queued: false, waiters: 0 }],
  });

  mock.reads[0]?.settle();
  await started;

  const state = anchor.session.get();

  if (state.status !== "signed-in") {
    throw new Error("Expected a session.");
  }

  state.session.getToken("api").catch(() => {});
  state.session.getToken("api").catch(() => {});

  const snapshot = anchor.diagnostics.get();

  expect(snapshot).toEqual({
    state: "started",
    adapter: { name: "mock" },
    session: {
      status: "signed-in",
      key: state.session.key,
      principal: state.session.principal,
      generation: 1,
    },
    operations: [
      {
        kind: "token",
        session: { key: state.session.key },
        profile: "api",
        forceRefresh: false,
        waiters: 2,
      },
    ],
  });
  expect(isDeepFrozen(snapshot)).toBe(true);

  state.session.end().catch(() => {});

  expect(anchor.diagnostics.get().operations).toEqual([
    { kind: "end", session: { key: state.session.key } },
  ]);

  anchor.dispose();

  expect(anchor.diagnostics.get().state).toBe("disposed");
});

test("the timeline of a start, a token and an end reads in order, each event naming its session", async () => {
  const mock = createMockAdapter<User, "api">({
    answer: signedIn("ada"),
    tokens: { api: {} },
  });

  const anchor = new Anchor({ adapter: mock.adapter });
  const events: AnchorDiagnosticEvent[] = [];

  anchor.diagnostics.events.subscribe((event) => events.push(event));
  await anchor.start();

  const state = anchor.session.get();

  if (state.status !== "signed-in") {
    throw new Error("Expected a session.");
  }

  const { key } = state.session;

  await state.session.getToken("api");
  await state.session.end();
  anchor.dispose();

  expect(
    events.map(({ type, session, context }) => [type, session, context]),
  ).toEqual([
    ["anchor started", null, null],
    ["read started", null, null],
    ["read completed", null, { status: "signed-in" }],
    ["session accepted", { key }, { status: "signed-in" }],
    ["token requested", { key }, { profile: "api", forceRefresh: false }],
    ["token received", { key }, { profile: "api", forceRefresh: false }],
    ["end started", { key }, null],
    [
      "end completed",
      { key },
      { local: "completed", remote: "not-applicable" },
    ],
    ["session signed out", { key }, null],
    ["anchor disposed", null, null],
  ]);
});

test("observing diagnostics starts nothing and asks the adapter for nothing", async () => {
  const onOpen = vi.fn();
  const mock = createMockAdapter<User>({ answer: signedIn("ada"), onOpen });
  const anchor = new Anchor({ adapter: mock.adapter });

  anchor.diagnostics.subscribe(() => {});
  anchor.diagnostics.events.subscribe(() => {});
  anchor.diagnostics.get();
  await tick();

  expect(onOpen.mock.calls).toEqual([]);
  expect(mock.reads).toEqual([]);
  expect(anchor.session.get().status).toBe("initializing");
});

test("snapshot observers hear one batched notification per turn of changes", async () => {
  const mock = createMockAdapter<User>({ answer: signedIn("ada") });
  const anchor = new Anchor({ adapter: mock.adapter });
  const listener = vi.fn();

  anchor.diagnostics.subscribe(listener);
  await anchor.start();
  await tick();

  const calls = listener.mock.calls.length;

  mock.push(signedIn("grace"));
  mock.push(signedIn("linus"));
  await Promise.resolve();

  expect(listener.mock.calls.length).toBe(calls + 1);
});

test("no event or snapshot carries a token value, the user's data or a provider's error", async () => {
  const mock = createMockAdapter<User, "api">({
    answer: signedIn("ada", { user: { name: "SECRET-NAME" } }),
    tokens: { api: {} },
    hold: { getToken: true, read: true },
  });

  const anchor = new Anchor({ adapter: mock.adapter });
  const seen: Array<AnchorDiagnosticEvent | AnchorSnapshot> = [];

  anchor.diagnostics.events.subscribe((event) => {
    seen.push(event, anchor.diagnostics.get());
  });

  const started = anchor.start();

  mock.reads[0]?.fail(new Error("SECRET-ERROR"));
  await started;
  mock.push(signedIn("ada", { user: { name: "SECRET-NAME" } }));

  const state = anchor.session.get();

  if (state.status !== "signed-in") {
    throw new Error("Expected a session.");
  }

  const token = state.session.getToken("api");

  mock.tokens[0]?.settle({
    value: "SECRET-TOKEN",
    kind: "access-token",
    scheme: "Bearer",
  });
  await token;

  const rejected = state.session.getToken("api");

  mock.tokens[1]?.fail(new Error("SECRET-ERROR"));
  await rejected.catch(() => {});
  anchor.dispose();

  const serialized = JSON.stringify(seen);

  expect(seen.map((item) => ("type" in item ? item.type : "snapshot"))).toEqual(
    [
      "anchor started",
      "snapshot",
      "read started",
      "snapshot",
      "read failed",
      "snapshot",
      "session unavailable",
      "snapshot",
      "session accepted",
      "snapshot",
      "token requested",
      "snapshot",
      "token received",
      "snapshot",
      "token requested",
      "snapshot",
      "token failed",
      "snapshot",
      "anchor disposed",
      "snapshot",
    ],
  );
  expect(serialized).not.toContain("SECRET-TOKEN");
  expect(serialized).not.toContain("SECRET-NAME");
  expect(serialized).not.toContain("SECRET-ERROR");
  expect(serialized).toContain('"subject":"ada"');
});
