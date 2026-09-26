import { expect, test } from "vitest";

import { createFakeBetterAuthClient } from "src/fakeBetterAuthClient.fixture";
import { getRefreshedSession } from "src/utils/getRefreshedSession";

const signal = new AbortController().signal;

test("the refreshed session is the one the atom's own fetch answered, or null", async () => {
  const fake = createFakeBetterAuthClient();
  const atom = fake.sdk.$store.atoms.session;

  await expect(getRefreshedSession(atom, signal)).resolves.toBe(null);

  fake.switchSilently("user_ada");

  await expect(getRefreshedSession(atom, signal)).resolves.toBe(fake.current());
});

test("a 401, which Better Auth answers after deleting the session cookie, is no session", async () => {
  const fake = createFakeBetterAuthClient();
  const atom = fake.sdk.$store.atoms.session;

  fake.switchSilently("user_ada");
  await atom.get().refetch();
  fake.failures.fetch = { status: 401, statusText: "Unauthorized" };

  await expect(getRefreshedSession(atom, signal)).resolves.toBe(null);
});

test("a failure answers the session the client still holds, and throws when it holds none", async () => {
  const fake = createFakeBetterAuthClient();
  const atom = fake.sdk.$store.atoms.session;
  const failure = new TypeError("Network request failed");

  fake.failures.network = failure;

  await expect(getRefreshedSession(atom, signal)).rejects.toBe(failure);

  fake.failures.network = null;
  fake.switchSilently("user_ada");
  await atom.get().refetch();
  fake.failures.network = failure;

  await expect(getRefreshedSession(atom, signal)).resolves.toMatchObject({
    user: { id: "user_ada" },
  });
});

test("the fetch restores the Expo plugin's cached session, which answers offline", async () => {
  const fake = createFakeBetterAuthClient({ expo: true });
  const atom = fake.sdk.$store.atoms.session;

  fake.cacheSession("user_ada");
  fake.failures.network = new TypeError("Network request failed");

  await expect(getRefreshedSession(atom, signal)).resolves.toMatchObject({
    user: { id: "user_ada" },
  });
});
