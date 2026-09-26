import { expect, test } from "vitest";

import { createMockAdapter } from "src/mock/createMockAdapter";
import type { AnchorSession } from "src/types/AnchorSession";
import { Anchor } from "src/utils/Anchor";
import { signedIn, tick } from "src/utils/answers.fixture";
import type { User } from "src/utils/answers.fixture";

const start = async (hold: { read?: boolean; end?: boolean } = {}) => {
  const mock = createMockAdapter<User, "api">({
    answer: signedIn("ada"),
    tokens: { api: {} },
    hold,
  });

  const anchor = new Anchor({ adapter: mock.adapter });
  const started = anchor.start();

  mock.reads[0]?.settle();
  await started;

  return { mock, anchor };
};

const getSignedInSession = (
  anchor: Anchor<User, unknown, "api">,
): AnchorSession<User, "api"> => {
  const state = anchor.session.get();

  if (state.status !== "signed-in") {
    throw new Error(`Expected a session, got ${state.status}.`);
  }

  return state.session;
};

test("an end whose local step completed is the evidence: the state is signed out before the provider says so", async () => {
  const { mock, anchor } = await start();

  await expect(getSignedInSession(anchor).end()).resolves.toEqual({
    local: "completed",
    remote: "not-applicable",
    navigation: null,
  });
  expect(anchor.session.get()).toEqual({ status: "signed-out" });
  expect(
    mock.ends.map(({ request }) => request.session.principal.subject),
  ).toEqual(["ada"]);
  expect(mock.reads).toHaveLength(1);
});

test("an end whose local step did not complete keeps the session usable and reads to reconcile", async () => {
  const { mock, anchor } = await start({ read: true, end: true });
  const session = getSignedInSession(anchor);
  const ending = session.end();

  mock.ends[0]?.settle({
    local: "unknown",
    remote: "completed",
    navigation: null,
  });

  await expect(ending).resolves.toMatchObject({ local: "unknown" });
  expect(mock.reads).toHaveLength(2);

  mock.reads[1]?.settle();
  await tick();

  expect(getSignedInSession(anchor).key).toBe(session.key);
  await expect(session.getToken("api")).resolves.toMatchObject({
    value: "api:ada:1",
  });
});

test("an end the provider must finish in a page hands the page to the caller", async () => {
  const { mock, anchor } = await start({ end: true });
  const ending = getSignedInSession(anchor).end();

  mock.ends[0]?.settle({
    local: "completed",
    remote: "unknown",
    navigation: { url: "https://example.auth0.com/v2/logout" },
  });

  await expect(ending).resolves.toEqual({
    local: "completed",
    remote: "unknown",
    navigation: { url: "https://example.auth0.com/v2/logout" },
  });
  expect(anchor.session.get()).toEqual({ status: "signed-out" });
});

test("a failed end leaves the session signed in, rejects END_FAILED and reads to reconcile", async () => {
  const { mock, anchor } = await start({ read: true, end: true });
  const session = getSignedInSession(anchor);
  const ending = session.end();

  mock.ends[0]?.fail(new TypeError("fetch failed"));

  await expect(ending).rejects.toMatchObject({ code: "END_FAILED" });
  expect(anchor.session.get()).toMatchObject({
    status: "signed-in",
    session: { key: session.key },
  });
  expect(mock.reads).toHaveLength(2);
});

test("two ends of one session share one adapter call and one result", async () => {
  const { mock, anchor } = await start({ end: true });
  const session = getSignedInSession(anchor);
  const first = session.end();
  const second = session.end();

  mock.ends[0]?.settle();

  expect(second).toBe(first);
  await expect(first).resolves.toMatchObject({ local: "completed" });
  expect(mock.ends).toHaveLength(1);
});

test("an adapter without end refuses to end with UNSUPPORTED and leaves the session alone", async () => {
  const mock = createMockAdapter<User>({ answer: signedIn("ada"), end: false });
  const anchor = new Anchor({ adapter: mock.adapter });

  await anchor.start();

  const state = anchor.session.get();

  if (state.status !== "signed-in") {
    throw new Error("Expected a session.");
  }

  await expect(state.session.end()).rejects.toMatchObject({
    code: "UNSUPPORTED",
  });
  expect(anchor.session.get()).toBe(state);
});
