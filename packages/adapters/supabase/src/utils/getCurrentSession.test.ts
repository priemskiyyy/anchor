import { expect, test } from "vitest";

import { createFakeSupabase } from "src/fakeSupabase.fixture";
import { getCurrentSession } from "src/utils/getCurrentSession";

test("the current session is the one supabase-js holds, or null", async () => {
  const fake = createFakeSupabase();

  await expect(getCurrentSession(fake.sdk)).resolves.toBe(null);

  fake.signIn("ada");

  await expect(getCurrentSession(fake.sdk)).resolves.toBe(fake.current());
});

test("an error supabase-js answers with is thrown as it is", async () => {
  const fake = createFakeSupabase();
  const failure = { name: "AuthRetryableFetchError", message: "fetch failed" };

  fake.failures.read = failure;

  await expect(getCurrentSession(fake.sdk)).rejects.toBe(failure);
});
