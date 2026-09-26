import { expect, test, vi } from "vitest";

import { createMockAdapter } from "src/mock/createMockAdapter";
import type { MockAdapterOptions } from "src/mock/types/MockAdapterOptions";
import type { AnchorSession } from "src/types/AnchorSession";
import { Anchor } from "src/utils/Anchor";
import {
  actionRequired,
  signedIn,
  signedOut,
  tick,
} from "src/utils/answers.fixture";
import type { User } from "src/utils/answers.fixture";

const create = (options: MockAdapterOptions<User, "api"> = {}) => {
  const mock = createMockAdapter<User, "api">({
    tokens: { api: {} },
    ...options,
  });

  const anchor = new Anchor({ adapter: mock.adapter });

  return { mock, anchor };
};

const getSignedInSession = (
  anchor: Anchor<User, unknown, "api">,
): AnchorSession<User, "api"> => {
  const state = anchor.session.get();

  if (state.status !== "signed-in" && state.status !== "action-required") {
    throw new Error(`Expected a session, got ${state.status}.`);
  }

  return state.session;
};

test("scenario 1: an initial signed-out provider resolves as signed-out", async () => {
  const { anchor } = create();

  await anchor.start();

  expect(anchor.session.get()).toEqual({ status: "signed-out" });
});

test("scenario 2: an initial signed-in provider resolves as signed-in", async () => {
  const { anchor } = create({ answer: signedIn("ada") });

  await anchor.start();

  expect(getSignedInSession(anchor).principal.subject).toBe("ada");
});

test("scenario 3: a slow initial read keeps the state initializing until it lands", async () => {
  const { mock, anchor } = create({
    answer: signedIn("ada"),
    hold: { read: true },
  });

  const started = anchor.start();

  await tick();

  expect(anchor.session.get()).toEqual({ status: "initializing" });

  mock.reads[0]?.settle();
  await started;

  expect(anchor.session.get().status).toBe("signed-in");
});

test("scenario 4: an event during the initial read wins over the read that started before it", async () => {
  const { mock, anchor } = create({
    answer: signedIn("ada"),
    hold: { read: true },
  });

  const started = anchor.start();

  mock.push(signedIn("grace"));
  mock.reads[0]?.settle(signedIn("ada"));
  await started;
  await tick();

  expect(getSignedInSession(anchor).principal.subject).toBe("grace");
});

test("scenario 5: duplicate events publish once", async () => {
  const { mock, anchor } = create();

  await anchor.start();

  const listener = vi.fn();

  anchor.session.subscribe(listener);
  mock.push(signedIn("ada"));
  mock.push(signedIn("ada"));
  mock.push(signedIn("ada"));

  expect(listener.mock.calls).toEqual([[]]);
});

test("scenario 6: a reentrant event supersedes the one being delivered", async () => {
  const { mock, anchor } = create();

  await anchor.start();

  const last: string[] = [];

  anchor.session.subscribe(() => {
    const state = anchor.session.get();

    if (
      state.status !== "signed-in" ||
      state.session.principal.subject !== "ada"
    ) {
      return;
    }

    mock.push(signedOut);
  });
  anchor.session.subscribe(() => last.push(anchor.session.get().status));
  mock.push(signedIn("ada"));

  expect(anchor.session.get()).toEqual({ status: "signed-out" });
  expect(last).toEqual(["signed-out"]);
});

test("scenario 7: signing out while a token is acquired rejects the token", async () => {
  const { mock, anchor } = create({
    answer: signedIn("ada"),
    hold: { getToken: true },
  });

  await anchor.start();

  const token = getSignedInSession(anchor).getToken("api");

  mock.push(signedOut);

  await expect(token).rejects.toMatchObject({ code: "SESSION_CHANGED" });
});

test("scenario 8: switching accounts while a token is acquired rejects the token", async () => {
  const { mock, anchor } = create({
    answer: signedIn("ada"),
    hold: { getToken: true },
  });

  await anchor.start();

  const token = getSignedInSession(anchor).getToken("api");

  mock.push(signedIn("grace"));
  mock.tokens[0]?.settle({
    value: "ada-token",
    kind: "access-token",
    scheme: "Bearer",
  });

  await expect(token).rejects.toMatchObject({ code: "SESSION_CHANGED" });
});

test("scenario 9: the same user in a new context is a new session", async () => {
  const { mock, anchor } = create({
    answer: signedIn("ada", { context: "org_1" }),
  });

  await anchor.start();

  const first = getSignedInSession(anchor).key;

  mock.push(signedIn("ada", { context: "org_2" }));

  expect(getSignedInSession(anchor).key).not.toBe(first);
});

test("scenario 10: equivalent token requests share one adapter call", async () => {
  const { mock, anchor } = create({
    answer: signedIn("ada"),
    hold: { getToken: true },
  });

  await anchor.start();

  const session = getSignedInSession(anchor);

  const tokens = [
    session.getToken("api"),
    session.getToken("api"),
    session.getToken("api"),
  ];

  mock.tokens[0]?.settle();

  const values = (await Promise.all(tokens)).map(({ value }) => value);

  expect(mock.tokens).toHaveLength(1);
  expect(values).toEqual(["api:ada:1", "api:ada:1", "api:ada:1"]);
});

test("scenario 11: forced and normal token requests never share", async () => {
  const { mock, anchor } = create({
    answer: signedIn("ada"),
    hold: { getToken: true },
  });

  await anchor.start();

  const session = getSignedInSession(anchor);
  const normal = session.getToken("api");
  const forced = session.getToken("api", { forceRefresh: true });

  mock.tokens[0]?.settle();
  mock.tokens[1]?.settle();

  expect(mock.tokens.map(({ request }) => request.forceRefresh)).toEqual([
    false,
    true,
  ]);
  expect((await normal).value).not.toBe((await forced).value);
});

test("scenario 12: one caller aborting a shared request leaves the others waiting for the token", async () => {
  const { mock, anchor } = create({
    answer: signedIn("ada"),
    hold: { getToken: true },
  });

  await anchor.start();

  const session = getSignedInSession(anchor);
  const controller = new AbortController();
  const aborted = session.getToken("api", { signal: controller.signal });
  const waiting = session.getToken("api");

  controller.abort();
  mock.tokens[0]?.settle();

  await expect(aborted).rejects.toMatchObject({ code: "ABORTED" });
  await expect(waiting).resolves.toMatchObject({ value: "api:ada:1" });
});

test("scenario 13: callbacks after disposal are ignored", async () => {
  const { mock, anchor } = create({ answer: signedIn("ada") });

  await anchor.start();
  anchor.dispose();
  mock.push(signedOut);
  mock.invalidate();

  expect(anchor.session.get().status).toBe("signed-in");
  expect(mock.reads).toHaveLength(1);
});

test("scenario 14: a start whose setup fails rolls back to initializing", async () => {
  const { anchor } = create({
    onOpen: (observer) => {
      observer.session(signedIn("ada"));

      throw new Error("setup failed");
    },
  });

  await expect(anchor.start()).rejects.toMatchObject({ code: "START_FAILED" });
  expect(anchor.session.get()).toEqual({ status: "initializing" });
});

test("scenario 15: a start may be retried after a failure", async () => {
  let failing = true;

  const { anchor } = create({
    answer: signedIn("ada"),
    onOpen: () => {
      if (!failing) {
        return;
      }

      throw new Error("not ready");
    },
  });

  await expect(anchor.start()).rejects.toMatchObject({ code: "START_FAILED" });

  failing = false;
  await anchor.start();

  expect(anchor.session.get().status).toBe("signed-in");
});

test("scenario 16: disposing during the start rejects the start and commits nothing", async () => {
  const { mock, anchor } = create({
    answer: signedIn("ada"),
    hold: { read: true },
  });

  const started = anchor.start();

  anchor.dispose();
  mock.reads[0]?.settle();

  await expect(started).rejects.toMatchObject({ code: "DISPOSED" });
  expect(anchor.session.get()).toEqual({ status: "initializing" });
});

test("scenario 17: a listener that throws stops no other listener", async () => {
  vi.spyOn(globalThis, "queueMicrotask").mockImplementation(() => {});

  const { mock, anchor } = create();

  await anchor.start();

  const after = vi.fn();

  anchor.session.subscribe(() => {
    throw new Error("listener failed");
  });
  anchor.session.subscribe(after);
  mock.push(signedIn("ada"));

  expect(after.mock.calls).toEqual([[]]);
});

test("scenario 18: a failed sync keeps the session it had", async () => {
  const { mock, anchor } = create({
    answer: signedIn("ada"),
    hold: { read: true },
  });

  const started = anchor.start();

  mock.reads[0]?.settle();
  await started;

  const session = getSignedInSession(anchor);
  const synced = anchor.sync();

  mock.reads[1]?.fail(new Error("offline"));

  await expect(synced).rejects.toMatchObject({ code: "READ_FAILED" });
  expect(getSignedInSession(anchor)).toBe(session);
});

test("scenario 19: a partial end keeps what it proved and signs the session out locally", async () => {
  const { mock, anchor } = create({
    answer: signedIn("ada"),
    hold: { end: true },
  });

  await anchor.start();

  const ending = getSignedInSession(anchor).end();

  mock.ends[0]?.settle({
    local: "completed",
    remote: "unknown",
    navigation: null,
  });

  await expect(ending).resolves.toEqual({
    local: "completed",
    remote: "unknown",
    navigation: null,
  });
  expect(anchor.session.get()).toEqual({ status: "signed-out" });
});

test("scenario 20: action-required becomes signed-in with the same session", async () => {
  const { mock, anchor } = create({
    answer: actionRequired("ada", "setup-mfa"),
  });

  await anchor.start();

  const blocked = getSignedInSession(anchor);

  mock.push(signedIn("ada"));

  expect(anchor.session.get().status).toBe("signed-in");
  expect(getSignedInSession(anchor).key).toBe(blocked.key);
});

test("scenario 21: signed-in becomes action-required with the same session", async () => {
  const { mock, anchor } = create({ answer: signedIn("ada") });

  await anchor.start();

  const session = getSignedInSession(anchor);

  mock.push(actionRequired("ada", "reset-password"));

  expect(anchor.session.get()).toMatchObject({
    status: "action-required",
    action: { kind: "reset-password" },
    session: { key: session.key },
  });
});

test("scenario 22: an unavailable provider is not signed out", async () => {
  const { mock, anchor } = create({ hold: { read: true } });
  const started = anchor.start();

  mock.reads[0]?.fail(new Error("storage unreadable"));
  await started;

  expect(anchor.session.get().status).toBe("unavailable");
});

test("scenario 23: an adapter answer outside the contract fails validation", async () => {
  const { mock, anchor } = create({ hold: { read: true } });
  const started = anchor.start();

  // @ts-expect-error An adapter written in JavaScript can answer anything.
  mock.reads[0]?.settle({ status: "signed-in", principal: { subject: "ada" } });
  await started;

  expect(anchor.session.get()).toMatchObject({
    status: "unavailable",
    error: { code: "INVALID_ANSWER" },
  });
});

test("scenario 24: a token that lands for an obsolete generation is rejected", async () => {
  const { mock, anchor } = create({
    answer: signedIn("ada"),
    hold: { getToken: true },
  });

  await anchor.start();

  const token = getSignedInSession(anchor).getToken("api");

  mock.push(signedIn("ada", { guest: true }));
  mock.tokens[0]?.settle();

  await expect(token).rejects.toMatchObject({ code: "SESSION_CHANGED" });
});

test("scenario 25: observing diagnostics creates no provider demand", async () => {
  const onOpen = vi.fn();
  const { mock, anchor } = create({ onOpen });

  anchor.diagnostics.subscribe(() => {});
  anchor.diagnostics.events.subscribe(() => {});
  anchor.diagnostics.get();
  await tick();

  expect(onOpen.mock.calls).toEqual([]);
  expect(mock.reads).toEqual([]);
});
