import { afterEach, expect, test, vi } from "vitest";

import { createFakeBetterAuthClient } from "src/fakeBetterAuthClient.fixture";
import type { BetterAuthSessionLike } from "src/types/BetterAuthSessionLike";
import { subscribeToSessionAnswers } from "src/utils/subscribeToSessionAnswers";

const TIMEOUT = 1_500;

const subscribe = (
  fake: ReturnType<typeof createFakeBetterAuthClient>,
  timeout: number | null,
) => {
  const answers: Array<string | null> = [];

  const unsubscribe = subscribeToSessionAnswers(
    fake.sdk.$store.atoms.session,
    timeout,
    (data: BetterAuthSessionLike | null) => answers.push(data?.user.id ?? null),
  );

  return { answers, unsubscribe };
};

afterEach(() => {
  vi.useRealTimers();
});

test("a settled fetch is an answer at once, with a session or with none, and arms no timer", async () => {
  vi.useFakeTimers();

  const fake = createFakeBetterAuthClient();
  const { answers } = subscribe(fake, TIMEOUT);

  fake.signIn("user_ada");
  await vi.advanceTimersByTimeAsync(0);

  expect(answers).toEqual(["user_ada"]);
  expect(vi.getTimerCount()).toBe(0);
});

test("a held session whose fetch is in flight is answered at the timeout, and not before", async () => {
  vi.useFakeTimers();

  const fake = createFakeBetterAuthClient({ expo: true });
  const { answers } = subscribe(fake, TIMEOUT);

  fake.cacheSession("user_ada");
  fake.holdFetches();
  await vi.advanceTimersByTimeAsync(TIMEOUT - 1);
  expect(answers).toEqual([]);

  await vi.advanceTimersByTimeAsync(1);
  expect(answers).toEqual(["user_ada"]);
});

test("the server's answer before the timeout is the only answer, and the timer is gone", async () => {
  vi.useFakeTimers();

  const fake = createFakeBetterAuthClient({ expo: true });
  const { answers } = subscribe(fake, TIMEOUT);

  fake.cacheSession("user_ada");
  fake.holdFetches();
  await vi.advanceTimersByTimeAsync(TIMEOUT - 1);
  fake.settleFetches();
  await vi.advanceTimersByTimeAsync(0);

  expect(answers).toEqual(["user_ada"]);
  expect(vi.getTimerCount()).toBe(0);

  await vi.advanceTimersByTimeAsync(TIMEOUT);
  expect(answers).toEqual(["user_ada"]);
});

test("another fetch starting while the timer is armed does not restart it", async () => {
  vi.useFakeTimers();

  const fake = createFakeBetterAuthClient({ expo: true });
  const { answers } = subscribe(fake, TIMEOUT);

  fake.cacheSession("user_ada");
  fake.holdFetches();
  await vi.advanceTimersByTimeAsync(TIMEOUT - 1);
  fake.refetch();
  await vi.advanceTimersByTimeAsync(1);

  expect(answers).toEqual(["user_ada"]);

  await vi.advanceTimersByTimeAsync(TIMEOUT);

  expect(answers).toEqual(["user_ada"]);
  expect(vi.getTimerCount()).toBe(0);
});

test("a fetch in flight with no session held is never answered by the timer", async () => {
  vi.useFakeTimers();

  const fake = createFakeBetterAuthClient();
  const { answers } = subscribe(fake, TIMEOUT);

  fake.holdFetches();
  await vi.advanceTimersByTimeAsync(TIMEOUT * 2);

  expect(answers).toEqual([]);
});

test("without a timeout, a held session waits for the server however long it takes", async () => {
  vi.useFakeTimers();

  const fake = createFakeBetterAuthClient({ expo: true });
  const { answers } = subscribe(fake, null);

  fake.cacheSession("user_ada");
  fake.holdFetches();
  await vi.advanceTimersByTimeAsync(TIMEOUT * 10);

  expect(answers).toEqual([]);
  expect(vi.getTimerCount()).toBe(0);
});

test("a session the server ended before the timer fired is answered as ended, once, and the timer never fires", async () => {
  vi.useFakeTimers();

  const fake = createFakeBetterAuthClient({ expo: true });
  const { answers } = subscribe(fake, TIMEOUT);

  fake.cacheSession("user_ada");
  fake.holdFetches();
  await vi.advanceTimersByTimeAsync(TIMEOUT - 1);
  fake.endOnServer();
  fake.settleFetches();
  await vi.advanceTimersByTimeAsync(0);

  expect(answers).toEqual([null]);
  await vi.advanceTimersByTimeAsync(TIMEOUT);
  expect(answers).toEqual([null]);
});

test("unsubscribing clears the pending timer and stops every answer", async () => {
  vi.useFakeTimers();

  const fake = createFakeBetterAuthClient({ expo: true });
  const { answers, unsubscribe } = subscribe(fake, TIMEOUT);

  fake.cacheSession("user_ada");
  fake.holdFetches();
  await vi.advanceTimersByTimeAsync(TIMEOUT - 1);
  unsubscribe();

  expect(vi.getTimerCount()).toBe(0);
  expect(fake.listeners.size).toBe(0);

  await vi.advanceTimersByTimeAsync(TIMEOUT);
  expect(answers).toEqual([]);
});
