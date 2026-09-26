import { expect, test } from "vitest";

import { createFakeAuthKitClient } from "src/fakeAuthKitClient.fixture";
import { signOutSession } from "src/utils/signOutSession";

const request = (subject: string, context: string) => ({
  session: {
    principal: { authority: "workos", subject, tenant: null },
    context,
  },
  signal: new AbortController().signal,
});

test("the session's own AuthKit session is signed out without navigating, and WorkOS's side is unknown", async () => {
  const fake = createFakeAuthKitClient();

  fake.signIn("user_ada", { organization: "org_acme" });

  await expect(
    signOutSession(
      fake.sdk,
      fake.refreshes,
      request("user_ada", '["org_acme",null]'),
    ),
  ).resolves.toEqual({
    local: "completed",
    remote: "unknown",
    navigation: null,
  });
  expect(fake.logouts).toEqual([{ session: "session_1", navigate: false }]);
  expect(fake.sdk.getUser()).toBe(null);
});

test("another user or organization is never signed out: the ending does not apply", async () => {
  const fake = createFakeAuthKitClient();

  fake.signIn("user_ada", { organization: "org_acme" });

  await expect(
    signOutSession(
      fake.sdk,
      fake.refreshes,
      request("user_ada", '["org_globex",null]'),
    ),
  ).resolves.toEqual({
    local: "not-applicable",
    remote: "not-applicable",
    navigation: null,
  });
  await expect(
    signOutSession(
      fake.sdk,
      fake.refreshes,
      request("user_grace", '["org_acme",null]'),
    ),
  ).resolves.toMatchObject({ local: "not-applicable" });
  expect(fake.logouts).toEqual([]);
  expect(fake.sdk.getUser()?.id).toBe("user_ada");
});
