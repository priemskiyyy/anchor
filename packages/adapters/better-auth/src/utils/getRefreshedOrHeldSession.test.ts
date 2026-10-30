import { afterEach, expect, test, vi } from "vitest";

import { createFakeBetterAuthClient } from "src/fakeBetterAuthClient.fixture";
import { END_REFRESH_BUDGET } from "src/utils/constants/betterAuth";
import { getRefreshedOrHeldSession } from "src/utils/getRefreshedOrHeldSession";

const signal = () => new AbortController().signal;

afterEach(() => {
  vi.useRealTimers();
});

test("a refresh that settles in time is answered as it is, and leaves no timer behind", async () => {
  vi.useFakeTimers();

  const fake = createFakeBetterAuthClient();

  fake.signIn("user_ada");

  const data = await getRefreshedOrHeldSession(
    fake.sdk.$store.atoms.session,
    signal(),
  );

  expect(data?.user.id).toBe("user_ada");
  expect(vi.getTimerCount()).toBe(0);
});

test("a refresh that does not settle within the budget answers the session the atom holds, at the budget and not before", async () => {
  vi.useFakeTimers();

  const fake = createFakeBetterAuthClient();

  fake.signIn("user_ada");
  await fake.refetch();
  fake.switchSilently("user_grace");
  fake.holdFetches();

  let answered: string | null | undefined;

  const waiting = getRefreshedOrHeldSession(
    fake.sdk.$store.atoms.session,
    signal(),
  ).then((data) => {
    answered = data?.user.id ?? null;
  });

  await vi.advanceTimersByTimeAsync(END_REFRESH_BUDGET - 1);
  expect(answered).toBeUndefined();

  await vi.advanceTimersByTimeAsync(1);
  await waiting;

  expect(answered).toBe("user_ada");
});

test("a refresh that fails answers the session the atom holds instead of throwing", async () => {
  const fake = createFakeBetterAuthClient();

  fake.signIn("user_ada");
  await fake.refetch();
  fake.failures.network = new TypeError("Failed to fetch");

  const data = await getRefreshedOrHeldSession(
    fake.sdk.$store.atoms.session,
    signal(),
  );

  expect(data?.user.id).toBe("user_ada");
});

test("a refresh that fails while the atom holds nothing answers no session", async () => {
  const fake = createFakeBetterAuthClient();

  fake.failures.network = new TypeError("Failed to fetch");

  await expect(
    getRefreshedOrHeldSession(fake.sdk.$store.atoms.session, signal()),
  ).resolves.toBe(null);
});
