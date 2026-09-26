import { expect, test } from "vitest";

import { createFakeAuthKitClient } from "src/fakeAuthKitClient.fixture";
import { getCurrentUser } from "src/utils/getCurrentUser";

test("the user AuthKit holds is answered at once, without asking for a token", async () => {
  const fake = createFakeAuthKitClient();

  fake.signIn("user_ada");

  await expect(getCurrentUser(fake.sdk)).resolves.toMatchObject({
    id: "user_ada",
  });
  expect(fake.refreshRequests).toEqual([]);
});

test("a user AuthKit holds is answered even while refreshing its token fails, since the session is still there", async () => {
  const fake = createFakeAuthKitClient();

  fake.signIn("user_ada");
  fake.expire();
  fake.failures.refresh = new TypeError("Failed to fetch");

  await expect(getCurrentUser(fake.sdk)).resolves.toMatchObject({
    id: "user_ada",
  });
});

test("without a user, only AuthKit's login-required answer is no session", async () => {
  const fake = createFakeAuthKitClient();

  await expect(getCurrentUser(fake.sdk)).resolves.toBe(null);
  expect(fake.refreshRequests).toEqual([{ organizationId: undefined }]);

  await expect(getCurrentUser(fake.sdk)).resolves.toBe(null);
  expect(fake.refreshRequests).toHaveLength(1);
});

test("a first refresh that failed on the network is no evidence either way: the read throws what AuthKit threw", async () => {
  const fake = createFakeAuthKitClient();
  const failure = new TypeError("Failed to fetch");

  fake.restoreOffline("user_ada", failure);

  await expect(getCurrentUser(fake.sdk)).rejects.toBe(failure);

  fake.failures.refresh = null;

  await expect(getCurrentUser(fake.sdk)).resolves.toMatchObject({
    id: "user_ada",
  });
});
