import { expect, test } from "vitest";

import { accessToken } from "src/accessToken";
import {
  MSAL_ENVIRONMENT,
  MSAL_TENANT,
  createFakePublicClientApplication,
} from "src/fakePublicClientApplication.fixture";
import { getSessionAccessToken } from "src/utils/getSessionAccessToken";

const tokens = { graph: accessToken({ scopes: ["User.Read"] }) };

const request = (
  subject: string,
  { profile = "graph", forceRefresh = false, context = "sid_1" } = {},
) => ({
  profile,
  forceRefresh,
  session: {
    principal: { authority: MSAL_ENVIRONMENT, subject, tenant: MSAL_TENANT },
    context,
  },
  signal: new AbortController().signal,
});

test("the profile's scopes are minted through acquireTokenSilent for exactly the session's account, with the scheme MSAL names", async () => {
  const fake = createFakePublicClientApplication();
  const ada = fake.signIn("ada");

  await expect(
    getSessionAccessToken(fake.sdk, tokens, request("ada")),
  ).resolves.toEqual({
    value: "access.ada.User.Read.1",
    kind: "access-token",
    scheme: "Bearer",
  });
  expect(fake.silentRequests).toEqual([
    { scopes: ["User.Read"], account: ada, forceRefresh: false },
  ]);
});

test("the scheme is the token type MSAL answers, such as pop for a proof-of-possession token", async () => {
  const fake = createFakePublicClientApplication();

  fake.signIn("ada");

  const sdk = {
    ...fake.sdk,
    acquireTokenSilent: async () => ({
      accessToken: "signed.pop.token",
      tokenType: "pop",
    }),
  };

  await expect(
    getSessionAccessToken(sdk, tokens, request("ada")),
  ).resolves.toEqual({
    value: "signed.pop.token",
    kind: "access-token",
    scheme: "pop",
  });
});

test("a forced token asks MSAL to skip its cache", async () => {
  const fake = createFakePublicClientApplication();

  fake.signIn("ada");
  await getSessionAccessToken(fake.sdk, tokens, request("ada"));

  await expect(
    getSessionAccessToken(
      fake.sdk,
      tokens,
      request("ada", { forceRefresh: true }),
    ),
  ).resolves.toMatchObject({ value: "access.ada.User.Read.2" });
  expect(fake.silentRequests.map(({ forceRefresh }) => forceRefresh)).toEqual([
    false,
    true,
  ]);
});

test("another active account, or none, is refused with SESSION_CHANGED before MSAL is asked", async () => {
  const fake = createFakePublicClientApplication();

  fake.signIn("grace");

  await expect(
    getSessionAccessToken(fake.sdk, tokens, request("ada")),
  ).rejects.toMatchObject({ code: "SESSION_CHANGED" });

  fake.sdk.setActiveAccount(null);

  await expect(
    getSessionAccessToken(fake.sdk, tokens, request("grace")),
  ).rejects.toMatchObject({ code: "SESSION_CHANGED" });
  expect(fake.silentRequests).toEqual([]);
});

test("an undeclared profile is refused with INVALID_CONFIGURATION", async () => {
  const fake = createFakePublicClientApplication();

  fake.signIn("ada");

  await expect(
    getSessionAccessToken(
      fake.sdk,
      tokens,
      request("ada", { profile: "mail" }),
    ),
  ).rejects.toMatchObject({ code: "INVALID_CONFIGURATION" });
  expect(fake.silentRequests).toEqual([]);
});

test("an InteractionRequiredAuthError is INTERACTION_REQUIRED, and any other failure is kept as MSAL threw it", async () => {
  const fake = createFakePublicClientApplication();

  const consent = Object.assign(new Error("consent_required"), {
    name: "InteractionRequiredAuthError",
    errorCode: "consent_required",
  });

  fake.signIn("ada");
  fake.failures.token = consent;

  await expect(
    getSessionAccessToken(fake.sdk, tokens, request("ada")),
  ).rejects.toMatchObject({ code: "INTERACTION_REQUIRED", cause: consent });

  const offline = new TypeError("fetch failed");

  fake.failures.token = offline;

  await expect(
    getSessionAccessToken(fake.sdk, tokens, request("ada")),
  ).rejects.toBe(offline);
});
