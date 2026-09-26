import { expect, test } from "vitest";

import { accessToken } from "src/accessToken";
import {
  AUTH0_ISSUER,
  createFakeAuth0Client,
} from "src/fakeAuth0Client.fixture";
import { getSessionAccessToken } from "src/utils/getSessionAccessToken";

const tokens = { api: accessToken({ audience: "https://api.example.com" }) };

const request = (
  subject: string,
  context: string | null,
  profile = "api",
  forceRefresh = false,
) => ({
  profile,
  forceRefresh,
  session: {
    principal: { authority: AUTH0_ISSUER, subject, tenant: null },
    context,
  },
  signal: new AbortController().signal,
});

test("the profile's token is minted for the session the cache holds, with the scheme Auth0 names", async () => {
  const fake = createFakeAuth0Client();

  fake.login("auth0|ada");

  await expect(
    getSessionAccessToken(
      fake.sdk,
      tokens,
      request("auth0|ada", '[null,"sid_1"]'),
    ),
  ).resolves.toEqual({
    value: "access.auth0|ada.https://api.example.com.1",
    kind: "access-token",
    scheme: "Bearer",
  });
});

test("another session is refused with SESSION_CHANGED before Auth0 is asked", async () => {
  const fake = createFakeAuth0Client();

  fake.login("auth0|grace");

  await expect(
    getSessionAccessToken(
      fake.sdk,
      tokens,
      request("auth0|ada", '[null,"sid_1"]'),
    ),
  ).rejects.toMatchObject({ code: "SESSION_CHANGED" });
  expect(fake.tokens).toEqual([]);
});

test("a token the silent iframe minted for a user who logged in elsewhere meanwhile is SESSION_CHANGED, never that user's token", async () => {
  const fake = createFakeAuth0Client();

  fake.login("auth0|ada");
  fake.loginInAnotherTab("auth0|grace");

  await expect(
    getSessionAccessToken(
      fake.sdk,
      tokens,
      request("auth0|ada", '[null,"sid_1"]', "api", true),
    ),
  ).rejects.toMatchObject({ code: "SESSION_CHANGED" });
  expect(fake.tokens).toHaveLength(1);
  expect(fake.claims()?.sub).toBe("auth0|grace");
});

test("an undeclared profile is refused with INVALID_CONFIGURATION", async () => {
  const fake = createFakeAuth0Client();

  fake.login("auth0|ada");

  await expect(
    getSessionAccessToken(
      fake.sdk,
      tokens,
      request("auth0|ada", '[null,"sid_1"]', "billing"),
    ),
  ).rejects.toMatchObject({ code: "INVALID_CONFIGURATION" });
});

test("no token from Auth0 is TOKEN_FAILED", async () => {
  const fake = createFakeAuth0Client();

  fake.login("auth0|ada");

  const sdk = { ...fake.sdk, getTokenSilently: async () => undefined };

  await expect(
    getSessionAccessToken(sdk, tokens, request("auth0|ada", '[null,"sid_1"]')),
  ).rejects.toMatchObject({
    code: "TOKEN_FAILED",
    message: "Auth0 answered no access token.",
  });
});
