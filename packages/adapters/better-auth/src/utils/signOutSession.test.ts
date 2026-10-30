import { afterEach, expect, test, vi } from "vitest";

import { createFakeBetterAuthClient } from "src/fakeBetterAuthClient.fixture";
import { END_REFRESH_BUDGET } from "src/utils/constants/betterAuth";
import { signOutSession } from "src/utils/signOutSession";

const request = (subject: string, context: string) => ({
  session: {
    principal: { authority: "better-auth", subject, tenant: null },
    context,
  },
  signal: new AbortController().signal,
});

const ADA_CONTEXT = '[null,null,"session_1"]';

afterEach(() => {
  vi.useRealTimers();
});

test("the session's own Better Auth session is signed out, on the server and here", async () => {
  const fake = createFakeBetterAuthClient();

  fake.signIn("user_ada");

  await expect(
    signOutSession(
      fake.sdk,
      fake.sdk.$store.atoms.session,
      request("user_ada", ADA_CONTEXT),
    ),
  ).resolves.toEqual({
    local: "completed",
    remote: "completed",
    navigation: null,
  });
  expect(fake.signOuts()).toBe(1);
  expect(fake.current()).toBe(null);
});

test("another session, as the refreshed atom holds it, is never signed out", async () => {
  const fake = createFakeBetterAuthClient();

  fake.signIn("user_ada");
  fake.signIn("user_ada");

  await expect(
    signOutSession(
      fake.sdk,
      fake.sdk.$store.atoms.session,
      request("user_ada", ADA_CONTEXT),
    ),
  ).resolves.toEqual({
    local: "not-applicable",
    remote: "not-applicable",
    navigation: null,
  });
  expect(fake.signOuts()).toBe(0);
});

test("a failed sign-out that left the session on the client is thrown as it is", async () => {
  const fake = createFakeBetterAuthClient();
  const failure = { status: 500, statusText: "Internal Server Error" };

  fake.signIn("user_ada");
  fake.failures.signOut = failure;

  await expect(
    signOutSession(
      fake.sdk,
      fake.sdk.$store.atoms.session,
      request("user_ada", ADA_CONTEXT),
    ),
  ).rejects.toBe(failure);
});

test("a failed sign-out after the Expo plugin cleared the session on the device ended it here, and the server's side is unknown", async () => {
  const fake = createFakeBetterAuthClient({ expo: true });

  fake.signIn("user_ada");
  fake.failures.signOutNetwork = new TypeError("Network request failed");

  await expect(
    signOutSession(
      fake.sdk,
      fake.sdk.$store.atoms.session,
      request("user_ada", ADA_CONTEXT),
    ),
  ).resolves.toEqual({
    local: "completed",
    remote: "unknown",
    navigation: null,
  });
});

test("a refresh that does not settle within the budget is given up on, and the session the atom holds is signed out", async () => {
  vi.useFakeTimers();

  const fake = createFakeBetterAuthClient();

  fake.signIn("user_ada");
  await fake.refetch();
  fake.holdFetches();

  const ending = signOutSession(
    fake.sdk,
    fake.sdk.$store.atoms.session,
    request("user_ada", ADA_CONTEXT),
  );

  await vi.advanceTimersByTimeAsync(END_REFRESH_BUDGET - 1);
  expect(fake.signOuts()).toBe(0);

  await vi.advanceTimersByTimeAsync(1);
  await expect(ending).resolves.toEqual({
    local: "completed",
    remote: "completed",
    navigation: null,
  });
  expect(fake.signOuts()).toBe(1);
});

test("a refresh that does not settle within the budget still signs nobody out when the atom holds another user", async () => {
  vi.useFakeTimers();

  const fake = createFakeBetterAuthClient();

  fake.signIn("user_grace");
  await fake.refetch();
  fake.holdFetches();

  const ending = signOutSession(
    fake.sdk,
    fake.sdk.$store.atoms.session,
    request("user_ada", ADA_CONTEXT),
  );

  await vi.advanceTimersByTimeAsync(END_REFRESH_BUDGET);
  await expect(ending).resolves.toEqual({
    local: "not-applicable",
    remote: "not-applicable",
    navigation: null,
  });
  expect(fake.signOuts()).toBe(0);
});

test("a refresh that fails while the atom holds no session ends nothing", async () => {
  const fake = createFakeBetterAuthClient();

  fake.failures.network = new TypeError("Failed to fetch");

  await expect(
    signOutSession(
      fake.sdk,
      fake.sdk.$store.atoms.session,
      request("user_ada", ADA_CONTEXT),
    ),
  ).resolves.toEqual({
    local: "not-applicable",
    remote: "not-applicable",
    navigation: null,
  });
  expect(fake.signOuts()).toBe(0);
});
