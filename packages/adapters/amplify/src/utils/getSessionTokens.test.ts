import { expect, test } from "vitest";

import {
  COGNITO_ISSUER,
  createFakeAmplifyAuth,
} from "src/fakeAmplifyAuth.fixture";
import { getSessionTokens } from "src/utils/getSessionTokens";

const identity = (subject: string, context: string | null = "origin_1") => ({
  principal: { authority: COGNITO_ISSUER, subject, tenant: null },
  context,
});

test("the session's own access and ID tokens are answered from fetchAuthSession, forced when asked", async () => {
  const fake = createFakeAmplifyAuth();

  fake.signIn("ada");

  const tokens = await getSessionTokens(fake.sdk, identity("ada"), true);

  expect(tokens?.accessToken.toString()).toBe("access.ada.2");
  expect(tokens?.idToken.toString()).toBe("id.ada.2");
  expect(fake.sessionRequests).toEqual([{ forceRefresh: true }]);
});

test("another user, another sign-in of the same user, no user and a user without an ID token are all null", async () => {
  const fake = createFakeAmplifyAuth();

  fake.signIn("grace");

  await expect(
    getSessionTokens(fake.sdk, identity("ada"), false),
  ).resolves.toBe(null);

  fake.signIn("grace");

  await expect(
    getSessionTokens(fake.sdk, identity("grace"), false),
  ).resolves.toBe(null);

  await fake.sdk.auth.signOut({ global: false });

  await expect(
    getSessionTokens(fake.sdk, identity("grace", "origin_2"), false),
  ).resolves.toBe(null);

  fake.switchSilently("ada", { originJti: "origin_1", idToken: false });

  await expect(
    getSessionTokens(fake.sdk, identity("ada"), false),
  ).resolves.toBe(null);
});
