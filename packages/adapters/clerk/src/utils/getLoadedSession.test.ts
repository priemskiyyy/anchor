import { expect, test } from "vitest";

import { createFakeClerk } from "src/fakeClerk.fixture";
import { getLoadedSession } from "src/utils/getLoadedSession";

const signal = new AbortController().signal;

test("a loaded Clerk answers its active session, or null without one, at once", async () => {
  const fake = createFakeClerk();

  await expect(getLoadedSession(fake.sdk, signal)).resolves.toBe(null);

  const session = fake.signIn("user_ada");

  await expect(getLoadedSession(fake.sdk, signal)).resolves.toBe(session);
  expect(fake.listeners()).toBe(0);
});

test("a Clerk still loading is waited for, and the wait stops listening once load() finished", async () => {
  const fake = createFakeClerk({ loaded: false });
  const session = fake.signIn("user_ada");
  const loadedSession = getLoadedSession(fake.sdk, signal);

  expect(fake.listeners()).toBe(2);

  fake.finishLoading();

  await expect(loadedSession).resolves.toBe(session);
  await expect.poll(() => fake.listeners()).toBe(0);
});

test("the emission load() makes before its status turns ready is not yet an answer", async () => {
  const fake = createFakeClerk({ loaded: false });
  let answered: unknown = "waiting";

  const loadedSession = getLoadedSession(fake.sdk, signal).then((session) => {
    answered = session;
  });

  fake.loadClient();
  await Promise.resolve();

  expect(answered).toBe("waiting");

  fake.markReady();
  await loadedSession;

  expect(answered).toBe(null);
});

test("a session Clerk is switching to is waited for, so a transition is never taken for a sign-out", async () => {
  const fake = createFakeClerk();

  fake.signIn("user_ada");
  fake.beginTransition();

  const loadedSession = getLoadedSession(fake.sdk, signal);
  const grace = fake.signIn("user_grace");

  await expect(loadedSession).resolves.toBe(grace);
});

test("a load that failed is no answer either way: the read throws", async () => {
  const fake = createFakeClerk({ loaded: false });
  const loadedSession = getLoadedSession(fake.sdk, signal);

  fake.failLoading();

  await expect(loadedSession).rejects.toThrow(
    "Clerk failed to load, so it cannot tell who is signed in.",
  );
  await expect(getLoadedSession(fake.sdk, signal)).rejects.toThrow(
    "Clerk failed to load, so it cannot tell who is signed in.",
  );
  await expect.poll(() => fake.listeners()).toBe(0);
});

test("an abort stops waiting with ABORTED and removes both handlers", async () => {
  const fake = createFakeClerk({ loaded: false });
  const controller = new AbortController();
  const loadedSession = getLoadedSession(fake.sdk, controller.signal);

  controller.abort();

  await expect(loadedSession).rejects.toMatchObject({ code: "ABORTED" });
  await expect.poll(() => fake.listeners()).toBe(0);
});

test("a status handler the application added after the wait's still runs when load() finishes the wait", async () => {
  const fake = createFakeClerk({ loaded: false });
  const heard: string[] = [];
  const loadedSession = getLoadedSession(fake.sdk, signal);

  fake.sdk.on("status", () => heard.push(fake.sdk.status));
  fake.finishLoading();
  await loadedSession;

  expect(heard).toEqual(["ready"]);
});
