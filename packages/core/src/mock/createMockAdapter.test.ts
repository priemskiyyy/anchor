import { expect, test, vi } from "vitest";

import { createMockAdapter } from "src/mock/createMockAdapter";
import type { SessionObserver } from "src/types/SessionObserver";
import { signedIn, signedOut } from "src/utils/answers.fixture";
import type { User } from "src/utils/answers.fixture";

const observer = (): SessionObserver<User> => ({
  session: vi.fn(),
  invalidate: vi.fn(),
});

const ada = { principal: signedIn("ada").principal, context: null };

test("the adapter is named, carries a native handle and declares the profiles it was given", () => {
  const named = createMockAdapter<User, "api">({
    name: "lab",
    tokens: { api: {} },
  });

  const plain = createMockAdapter<User>();

  expect(named.adapter.name).toBe("lab");
  expect(named.adapter.native).toEqual({ name: "lab" });
  expect(named.adapter.tokens).toEqual({ api: {} });
  expect(plain.adapter.name).toBe("mock");
  expect(plain.adapter.tokens).toEqual({});
});

test("an unheld read answers what the provider holds, and every read is recorded", async () => {
  const mock = createMockAdapter<User>({ answer: signedIn("ada") });
  const session = mock.adapter.open(observer());
  const signal = new AbortController().signal;

  await expect(session.read({ signal })).resolves.toEqual(signedIn("ada"));

  mock.change(signedOut);

  await expect(session.read({ signal })).resolves.toEqual(signedOut);
  expect(mock.reads.map(({ context }) => context.signal)).toEqual([
    signal,
    signal,
  ]);
});

test("a held read waits for the test, and settle without an answer gives what the provider holds then", async () => {
  const mock = createMockAdapter<User>({ hold: { read: true } });
  const session = mock.adapter.open(observer());
  const first = session.read({ signal: new AbortController().signal });
  const second = session.read({ signal: new AbortController().signal });
  const failure = new Error("offline");

  mock.change(signedIn("grace"));
  mock.reads[0]?.settle();
  mock.reads[1]?.fail(failure);

  await expect(first).resolves.toEqual(signedIn("grace"));
  await expect(second).rejects.toBe(failure);
});

test("an unheld token is minted only for the session the provider holds, and named after the profile and the subject", async () => {
  const mock = createMockAdapter<User, "api">({
    answer: signedIn("ada"),
    tokens: { api: {} },
  });

  const session = mock.adapter.open(observer());
  const signal = new AbortController().signal;

  await expect(
    session.getToken?.({
      profile: "api",
      forceRefresh: false,
      session: ada,
      signal,
    }),
  ).resolves.toEqual({
    value: "api:ada:1",
    kind: "access-token",
    scheme: "Bearer",
  });

  mock.change(signedIn("grace"));

  await expect(
    session.getToken?.({
      profile: "api",
      forceRefresh: true,
      session: ada,
      signal,
    }),
  ).rejects.toMatchObject({ code: "SESSION_CHANGED" });
  expect(mock.tokens.map(({ request }) => request.forceRefresh)).toEqual([
    false,
    true,
  ]);
});

test("a held token and a held end wait for the test, which may answer anything", async () => {
  const mock = createMockAdapter<User, "api">({
    answer: signedIn("ada"),
    tokens: { api: {} },
    hold: true,
  });

  const session = mock.adapter.open(observer());
  const signal = new AbortController().signal;

  const token = session.getToken?.({
    profile: "api",
    forceRefresh: false,
    session: ada,
    signal,
  });

  const ending = session.end?.({ session: ada, signal });

  mock.tokens[0]?.settle({ value: "custom", kind: "id-token", scheme: null });
  mock.ends[0]?.settle({
    local: "unknown",
    remote: "unknown",
    navigation: null,
  });

  await expect(token).resolves.toEqual({
    value: "custom",
    kind: "id-token",
    scheme: null,
  });
  await expect(ending).resolves.toEqual({
    local: "unknown",
    remote: "unknown",
    navigation: null,
  });
});

test("an unheld end signs the provider out for its own session and answers not-applicable for another", async () => {
  const mock = createMockAdapter<User>({ answer: signedIn("ada") });
  const session = mock.adapter.open(observer());
  const signal = new AbortController().signal;
  const grace = { principal: signedIn("grace").principal, context: null };

  await expect(session.end?.({ session: grace, signal })).resolves.toEqual({
    local: "not-applicable",
    remote: "not-applicable",
    navigation: null,
  });
  expect(mock.current()).toEqual(signedIn("ada"));

  await expect(session.end?.({ session: ada, signal })).resolves.toEqual({
    local: "completed",
    remote: "not-applicable",
    navigation: null,
  });
  expect(mock.current()).toEqual(signedOut);
});

test("getToken: false and end: false leave the methods out", () => {
  const mock = createMockAdapter<User>({ getToken: false, end: false });
  const session = mock.adapter.open(observer());

  expect(Object.keys(session).sort()).toEqual(["dispose", "read"]);
});

test("push tells every opened observer, disposed or not; change tells nobody; invalidate asks everyone to read", () => {
  const mock = createMockAdapter<User>();
  const first = observer();
  const second = observer();

  mock.adapter.open(first).dispose?.();
  mock.adapter.open(second);
  mock.push(signedIn("ada"));
  mock.change(signedIn("grace"));
  mock.invalidate();

  expect(first.session).toHaveBeenCalledWith(signedIn("ada"));
  expect(second.session).toHaveBeenCalledWith(signedIn("ada"));
  expect(vi.mocked(second.session).mock.calls).toHaveLength(1);
  expect(vi.mocked(first.invalidate).mock.calls).toEqual([[]]);
  expect(vi.mocked(second.invalidate).mock.calls).toEqual([[]]);
  expect(mock.current()).toEqual(signedIn("grace"));
  expect(mock.sessions.map(({ disposeCount }) => disposeCount)).toEqual([1, 0]);
});

test("onOpen runs inside open with the observer, and throwing from it fails the open without recording a session", () => {
  const opened: SessionObserver<User>[] = [];
  const failure = new Error("not initialized");

  const mock = createMockAdapter<User>({
    onOpen: (openedObserver) => {
      opened.push(openedObserver);

      throw failure;
    },
  });

  const given = observer();

  expect(() => mock.adapter.open(given)).toThrow(failure);
  expect(opened).toEqual([given]);
  expect(mock.sessions).toEqual([]);
});
