import { expect, test } from "vitest";

import { accessToken } from "src/accessToken";
import {
  COGNITO_ISSUER,
  createFakeAmplifyAuth,
} from "src/fakeAmplifyAuth.fixture";
import { idToken } from "src/idToken";
import { getSessionToken } from "src/utils/getSessionToken";

const tokens = { api: accessToken(), identity: idToken() };

const request = (
  subject: string,
  { profile = "api", forceRefresh = false, context = "origin_1" } = {},
) => ({
  profile,
  forceRefresh,
  session: {
    principal: { authority: COGNITO_ISSUER, subject, tenant: null },
    context,
  },
  signal: new AbortController().signal,
});

test("the access token profile mints Cognito's access token as a bearer token, and the ID token profile its ID token with no scheme", async () => {
  const fake = createFakeAmplifyAuth();

  fake.signIn("ada");

  await expect(
    getSessionToken(fake.sdk, tokens, request("ada")),
  ).resolves.toEqual({
    value: "access.ada.1",
    kind: "access-token",
    scheme: "Bearer",
  });
  await expect(
    getSessionToken(fake.sdk, tokens, request("ada", { profile: "identity" })),
  ).resolves.toEqual({ value: "id.ada.1", kind: "id-token", scheme: null });
  expect(fake.sessionRequests).toEqual([
    { forceRefresh: false },
    { forceRefresh: false },
  ]);
});

test("a forced token asks fetchAuthSession to refresh", async () => {
  const fake = createFakeAmplifyAuth();

  fake.signIn("ada");

  await expect(
    getSessionToken(fake.sdk, tokens, request("ada", { forceRefresh: true })),
  ).resolves.toMatchObject({ value: "access.ada.2" });
  expect(fake.sessionRequests).toEqual([{ forceRefresh: true }]);
});

test("another user, or none, is refused with SESSION_CHANGED", async () => {
  const fake = createFakeAmplifyAuth();

  fake.signIn("grace");

  await expect(
    getSessionToken(fake.sdk, tokens, request("ada")),
  ).rejects.toMatchObject({ code: "SESSION_CHANGED" });

  await fake.sdk.auth.signOut({ global: false });

  await expect(
    getSessionToken(fake.sdk, tokens, request("grace")),
  ).rejects.toMatchObject({ code: "SESSION_CHANGED" });
});

test("an undeclared profile is refused with INVALID_CONFIGURATION before Amplify is asked", async () => {
  const fake = createFakeAmplifyAuth();

  fake.signIn("ada");

  await expect(
    getSessionToken(fake.sdk, tokens, request("ada", { profile: "billing" })),
  ).rejects.toMatchObject({ code: "INVALID_CONFIGURATION" });
  expect(fake.sessionRequests).toEqual([]);
});

test("a refresh Cognito answers with PasswordResetRequiredException is INTERACTION_REQUIRED, and any other failure is kept as Amplify threw it", async () => {
  const fake = createFakeAmplifyAuth();

  const reset = Object.assign(new Error("Password reset required"), {
    name: "PasswordResetRequiredException",
  });

  fake.signIn("ada");
  fake.failures.refresh = reset;

  await expect(
    getSessionToken(fake.sdk, tokens, request("ada", { forceRefresh: true })),
  ).rejects.toMatchObject({ code: "INTERACTION_REQUIRED", cause: reset });

  const offline = new TypeError("fetch failed");

  fake.signIn("ada", { originJti: "origin_1" });
  fake.failures.refresh = offline;

  await expect(
    getSessionToken(fake.sdk, tokens, request("ada", { forceRefresh: true })),
  ).rejects.toBe(offline);
});
