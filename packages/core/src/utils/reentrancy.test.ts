import { expect, test } from "vitest";

import { createMockAdapter } from "src/mock/createMockAdapter";
import type { AnchorSession } from "src/types/AnchorSession";
import { Anchor } from "src/utils/Anchor";
import { actionRequired, signedIn, tick } from "src/utils/answers.fixture";
import type { User } from "src/utils/answers.fixture";

type Held = { read?: boolean; getToken?: boolean; end?: boolean };

const create = (hold: Held = {}) => {
  const mock = createMockAdapter<User, "api">({
    answer: signedIn("ada"),
    tokens: { api: {} },
    hold,
  });

  const anchor = new Anchor({ adapter: mock.adapter, timeout: 60_000 });

  return { mock, anchor };
};

const getSession = (
  anchor: Anchor<User, unknown, "api">,
): AnchorSession<User, "api"> => {
  const state = anchor.session.get();

  if (state.status !== "signed-in" && state.status !== "action-required") {
    throw new Error(`Expected a session, got ${state.status}.`);
  }

  return state.session;
};

const getSubject = (anchor: Anchor<User, unknown, "api">) =>
  getSession(anchor).principal.subject;

const getSettlement = (promise: Promise<unknown>) => {
  const settlement = { status: "pending", code: "" };

  promise.then(
    () => {
      settlement.status = "resolved";
    },
    (error: unknown) => {
      settlement.status = "rejected";
      settlement.code =
        error instanceof Error && "code" in error ? String(error.code) : "";
    },
  );

  return settlement;
};

test("a sync() from a subscriber while a read commits never starts a second read beside the running one, and dispose settles it", async () => {
  const { mock, anchor } = create({ read: true });
  const started = anchor.start();
  const queued = getSettlement(anchor.sync());
  const reentrant: Promise<void>[] = [];

  anchor.session.subscribe(() => {
    if (reentrant.length > 0) {
      return;
    }

    reentrant.push(anchor.sync());
  });

  mock.reads[0]?.settle(signedIn("ada"));
  await started;
  await tick();

  expect(mock.reads).toHaveLength(2);
  expect(anchor.diagnostics.get().operations).toEqual([
    { kind: "read", queued: false, waiters: 1 },
    { kind: "read", queued: true, waiters: 1 },
  ]);

  const [first] = reentrant;

  if (first === undefined) {
    throw new Error("The subscriber never synced.");
  }

  const settlement = getSettlement(first);

  anchor.dispose();
  await tick();

  expect(settlement).toEqual({ status: "rejected", code: "DISPOSED" });
  expect(queued).toEqual({ status: "rejected", code: "DISPOSED" });
  expect(mock.reads[1]?.context.signal.aborted).toBe(true);
});

test("a sync() called while the adapter opens waits for the first read, and settles with it", async () => {
  const anchors: Anchor<User, unknown, "api">[] = [];
  const settlements: { status: string; code: string }[] = [];

  const mock = createMockAdapter<User, "api">({
    answer: signedIn("ada"),
    tokens: { api: {} },
    onOpen: () => {
      const [anchor] = anchors;

      if (anchor === undefined) {
        return;
      }

      settlements.push(getSettlement(anchor.sync()));
    },
  });

  anchors.push(new Anchor({ adapter: mock.adapter }));
  await anchors[0]?.start();
  await tick();

  expect(settlements).toEqual([{ status: "resolved", code: "" }]);
  expect(mock.reads).toHaveLength(1);
});

test("a push a diagnostics listener makes while a read completes wins over that older read", async () => {
  const { mock, anchor } = create({ read: true });
  const pushed: string[] = [];

  anchor.diagnostics.events.subscribe((event) => {
    if (event.type !== "read completed" || pushed.length > 0) {
      return;
    }

    pushed.push("grace");
    mock.push(signedIn("grace"));
  });

  const started = anchor.start();

  mock.reads[0]?.settle(signedIn("ada"));
  await started;
  await tick();

  expect(pushed).toEqual(["grace"]);
  expect(getSubject(anchor)).toBe("grace");
});

test("a push an adapter makes when a replaced session's signal aborts wins over the answer that replaced it", async () => {
  const { mock, anchor } = create({ getToken: true });

  await anchor.start();

  const token = getSettlement(getSession(anchor).getToken("api"));

  mock.tokens[0]?.request.signal.addEventListener("abort", () => {
    mock.push(signedIn("grace"));
  });

  mock.push(signedIn("linus"));
  await tick();

  expect(getSubject(anchor)).toBe("grace");
  expect(token).toEqual({ status: "rejected", code: "SESSION_CHANGED" });
});

test("a push an adapter makes when a sign-out closes the session wins over that sign-out", async () => {
  const { mock, anchor } = create({ getToken: true });

  await anchor.start();

  const token = getSettlement(getSession(anchor).getToken("api"));

  mock.tokens[0]?.request.signal.addEventListener("abort", () => {
    mock.push(signedIn("grace"));
  });

  mock.push({ status: "signed-out" });
  await tick();

  expect(getSubject(anchor)).toBe("grace");
  expect(token).toEqual({ status: "rejected", code: "SESSION_CHANGED" });
});

test("a state a commit publishes reaches every subscriber before a diagnostics listener of that commit can dispose the Anchor", async () => {
  const { mock, anchor } = create();
  const disposed: boolean[] = [];
  const seen: boolean[] = [];

  await anchor.start();

  anchor.diagnostics.events.subscribe((event) => {
    if (event.type !== "session accepted") {
      return;
    }

    anchor.dispose();
    disposed.push(true);
  });

  anchor.session.subscribe(() => {
    seen.push(disposed.length > 0);
  });

  mock.push(signedIn("grace"));

  expect(seen).toEqual([false]);
  expect(getSubject(anchor)).toBe("grace");
});

test("a token request a diagnostics listener disposes the Anchor for never reaches the adapter", async () => {
  const { mock, anchor } = create();

  await anchor.start();

  anchor.diagnostics.events.subscribe((event) => {
    if (event.type !== "token requested") {
      return;
    }

    anchor.dispose();
  });

  await expect(getSession(anchor).getToken("api")).rejects.toMatchObject({
    code: "DISPOSED",
  });
  expect(mock.tokens).toEqual([]);
});

test("a caller that stops waiting for a shared token leaves the diagnostics counting the callers still waiting", async () => {
  const { anchor } = create({ getToken: true });

  await anchor.start();

  const session = getSession(anchor);
  const controller = new AbortController();

  const leaving = getSettlement(
    session.getToken("api", { signal: controller.signal }),
  );

  getSettlement(session.getToken("api"));

  expect(anchor.diagnostics.get().operations).toMatchObject([
    { kind: "token", profile: "api", waiters: 2 },
  ]);

  controller.abort();
  await tick();

  expect(leaving).toEqual({ status: "rejected", code: "ABORTED" });
  expect(anchor.diagnostics.get().operations).toMatchObject([
    { kind: "token", profile: "api", waiters: 1 },
  ]);
  anchor.dispose();
});

test("dispose rejects the running end of a session already replaced, and a stale session's operations after dispose reject DISPOSED", async () => {
  const { mock, anchor } = create({ end: true });

  await anchor.start();

  const ada = getSession(anchor);
  const ending = getSettlement(ada.end());

  mock.push(signedIn("grace"));
  anchor.dispose();
  await tick();

  expect(ending).toEqual({ status: "rejected", code: "DISPOSED" });
  await expect(ada.getToken("api")).rejects.toMatchObject({
    code: "DISPOSED",
  });
  await expect(ada.end()).rejects.toMatchObject({ code: "DISPOSED" });

  mock.ends[0]?.settle({
    local: "completed",
    remote: "completed",
    navigation: null,
  });
  await tick();

  expect(ending).toEqual({ status: "rejected", code: "DISPOSED" });
});

test("a status change within one security context keeps the same session object", async () => {
  const { mock, anchor } = create();

  await anchor.start();

  const before = getSession(anchor);

  mock.push(actionRequired("ada", "setup-mfa"));

  expect(anchor.session.get().status).toBe("action-required");
  expect(getSession(anchor)).toBe(before);

  mock.push(signedIn("ada"));

  expect(anchor.session.get().status).toBe("signed-in");
  expect(getSession(anchor)).toBe(before);
});
