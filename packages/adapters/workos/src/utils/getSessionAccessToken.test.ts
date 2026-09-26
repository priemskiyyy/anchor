import { expect, test } from "vitest";

import { createFakeAuthKitClient } from "src/fakeAuthKitClient.fixture";
import { getSessionAccessToken } from "src/utils/getSessionAccessToken";

const request = (subject: string, context: string, forceRefresh = false) => ({
  profile: "api",
  forceRefresh,
  session: {
    principal: { authority: "workos", subject, tenant: null },
    context,
  },
  signal: new AbortController().signal,
});

test("the access token AuthKit holds is answered as a bearer token, and a forced one is refreshed first", async () => {
  const fake = createFakeAuthKitClient();

  fake.signIn("user_ada", { organization: "org_acme" });

  await expect(
    getSessionAccessToken(
      fake.sdk,
      fake.refreshes,
      request("user_ada", '["org_acme",null]'),
    ),
  ).resolves.toEqual({
    value: "access.user_ada.1",
    kind: "access-token",
    scheme: "Bearer",
  });
  expect(fake.refreshRequests).toEqual([]);

  await expect(
    getSessionAccessToken(
      fake.sdk,
      fake.refreshes,
      request("user_ada", '["org_acme",null]', true),
    ),
  ).resolves.toMatchObject({ value: "access.user_ada.2" });
  expect(fake.refreshRequests).toEqual([{ organizationId: undefined }]);
});

test.each([
  ["another user", "user_grace", '["org_acme",null]'],
  ["another organization", "user_ada", '["org_globex",null]'],
  ["an impersonation", "user_ada", '["org_acme","support@example.com"]'],
])(
  "%s is refused with SESSION_CHANGED before AuthKit is asked",
  async (_other, subject, context) => {
    const fake = createFakeAuthKitClient();

    fake.signIn("user_ada", { organization: "org_acme" });

    await expect(
      getSessionAccessToken(
        fake.sdk,
        fake.refreshes,
        request(subject, context, true),
      ),
    ).rejects.toMatchObject({ code: "SESSION_CHANGED" });
    expect(fake.refreshRequests).toEqual([]);
  },
);

test("an organization switch while AuthKit mints is SESSION_CHANGED, never the other organization's token", async () => {
  const fake = createFakeAuthKitClient();
  const mint = fake.sdk.getAccessToken;

  fake.signIn("user_ada", { organization: "org_acme" });

  fake.sdk.getAccessToken = async (options) => {
    fake.switchToOrganization("org_globex");

    return mint(options);
  };

  await expect(
    getSessionAccessToken(
      fake.sdk,
      fake.refreshes,
      request("user_ada", '["org_acme",null]'),
    ),
  ).rejects.toMatchObject({ code: "SESSION_CHANGED" });
});

test("a refresh WorkOS refuses asks for the user with INTERACTION_REQUIRED", async () => {
  const fake = createFakeAuthKitClient();

  fake.signIn("user_ada");
  fake.endAtWorkos();

  await expect(
    getSessionAccessToken(
      fake.sdk,
      fake.refreshes,
      request("user_ada", "[null,null]", true),
    ),
  ).rejects.toMatchObject({
    code: "INTERACTION_REQUIRED",
    cause: new Error("No access token available"),
  });
  expect(fake.sdk.getUser()).toBe(null);
});

test("a failure AuthKit keeps the session through is thrown as it is", async () => {
  const fake = createFakeAuthKitClient();

  const failure = Object.assign(new Error("Failed to refresh"), {
    name: "RefreshError",
    isTransient: true,
  });

  fake.signIn("user_ada");
  fake.failures.refresh = failure;

  await expect(
    getSessionAccessToken(
      fake.sdk,
      fake.refreshes,
      request("user_ada", "[null,null]", true),
    ),
  ).rejects.toBe(failure);
  expect(fake.sdk.getUser()?.id).toBe("user_ada");
});
