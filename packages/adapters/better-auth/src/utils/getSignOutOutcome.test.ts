import { expect, test } from "vitest";

import { createFakeBetterAuthClient } from "src/fakeBetterAuthClient.fixture";
import { getSignOutOutcome } from "src/utils/getSignOutOutcome";

test("a sign-out Better Auth confirmed has not failed", async () => {
  const fake = createFakeBetterAuthClient();

  fake.signIn("user_ada");

  await expect(getSignOutOutcome(fake.sdk)).resolves.toEqual({ failed: false });
});

test("an HTTP error answered and a network error thrown both fail, with the error", async () => {
  const fake = createFakeBetterAuthClient();
  const answered = { status: 500, statusText: "Internal Server Error" };
  const thrown = new TypeError("Failed to fetch");

  fake.failures.signOut = answered;

  await expect(getSignOutOutcome(fake.sdk)).resolves.toEqual({
    failed: true,
    error: answered,
  });

  fake.failures.signOutNetwork = thrown;

  await expect(getSignOutOutcome(fake.sdk)).resolves.toEqual({
    failed: true,
    error: thrown,
  });
});
