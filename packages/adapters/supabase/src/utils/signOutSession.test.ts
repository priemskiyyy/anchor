import { expect, test } from "vitest";

import { createFakeSupabase } from "src/fakeSupabase.fixture";
import { signOutSession } from "src/utils/signOutSession";

const request = (subject: string) => ({
  session: {
    principal: { authority: "supabase", subject, tenant: null },
    context: null,
  },
  signal: new AbortController().signal,
});

test("the session's own user is signed out with the local scope, remotely and locally", async () => {
  const fake = createFakeSupabase();

  fake.signIn("ada");

  await expect(signOutSession(fake.sdk, request("ada"))).resolves.toEqual({
    local: "completed",
    remote: "completed",
    navigation: null,
  });
  expect(fake.signOuts).toEqual([{ scope: "local" }]);
  expect(fake.current()).toBe(null);
});

test("another session is never signed out: the ending does not apply", async () => {
  const fake = createFakeSupabase();

  fake.signIn("grace");

  await expect(signOutSession(fake.sdk, request("ada"))).resolves.toEqual({
    local: "not-applicable",
    remote: "not-applicable",
    navigation: null,
  });
  expect(fake.signOuts).toEqual([]);
});

test("a sign-out supabase-js answers with an error is thrown as it is", async () => {
  const fake = createFakeSupabase();
  const failure = { name: "AuthRetryableFetchError", message: "fetch failed" };

  fake.signIn("ada");
  fake.failures.signOut = failure;

  await expect(signOutSession(fake.sdk, request("ada"))).rejects.toBe(failure);
});
