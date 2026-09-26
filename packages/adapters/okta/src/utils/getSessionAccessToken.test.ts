import { expect, test } from "vitest";

import { OKTA_ISSUER, createFakeOktaAuth } from "src/fakeOktaAuth.fixture";
import { getSessionAccessToken } from "src/utils/getSessionAccessToken";

const request = (subject: string, forceRefresh = false) => ({
  profile: "api",
  forceRefresh,
  session: {
    principal: { authority: OKTA_ISSUER, subject, tenant: null },
    context: "sid_1",
  },
  signal: new AbortController().signal,
});

test("the stored access token is answered with its token type as the scheme while it has not expired", async () => {
  const fake = createFakeOktaAuth();

  await fake.signIn("ada");

  await expect(
    getSessionAccessToken(fake.sdk, request("ada")),
  ).resolves.toEqual({
    value: "access.ada.1",
    kind: "access-token",
    scheme: "Bearer",
  });
  expect(fake.renewals).toEqual([]);
});

test("the scheme is the token type Okta answered, such as DPoP", async () => {
  const fake = createFakeOktaAuth();

  await fake.signIn("ada", { tokenType: "DPoP" });

  await expect(
    getSessionAccessToken(fake.sdk, request("ada")),
  ).resolves.toEqual({
    value: "access.ada.1",
    kind: "access-token",
    scheme: "DPoP",
  });
});

test("an expired or a forced token is renewed under the key the token manager stores it by", async () => {
  const fake = createFakeOktaAuth({ accessTokenKey: "okta-access" });

  await fake.signIn("ada");
  fake.expire();

  await expect(
    getSessionAccessToken(fake.sdk, request("ada")),
  ).resolves.toMatchObject({ value: "access.ada.2" });
  await expect(
    getSessionAccessToken(fake.sdk, request("ada", true)),
  ).resolves.toMatchObject({ value: "access.ada.3" });
  expect(fake.renewals).toEqual(["okta-access", "okta-access"]);
});

test("a token manager without an access token renews by its own key", async () => {
  const fake = createFakeOktaAuth({ accessTokenKey: "okta-access" });

  await fake.signIn("ada");
  await fake.removeAccessToken();

  await expect(
    getSessionAccessToken(fake.sdk, request("ada")),
  ).resolves.toMatchObject({ value: "access.ada.2" });
  expect(fake.renewals).toEqual(["accessToken"]);
});

test("another session is refused with SESSION_CHANGED before anything renews", async () => {
  const fake = createFakeOktaAuth();

  await fake.signIn("grace");

  await expect(
    getSessionAccessToken(fake.sdk, request("ada", true)),
  ).rejects.toMatchObject({ code: "SESSION_CHANGED" });

  fake.sdk.tokenManager.clear();

  await expect(
    getSessionAccessToken(fake.sdk, request("ada")),
  ).rejects.toMatchObject({ code: "SESSION_CHANGED" });
  expect(fake.renewals).toEqual([]);
});

test("a renewal after which okta-auth-js holds another session is SESSION_CHANGED, never that session's token", async () => {
  const fake = createFakeOktaAuth();

  await fake.signIn("ada");

  fake.sdk.tokenManager.renew = async () => {
    fake.switchSilently("grace");

    return undefined;
  };

  await expect(
    getSessionAccessToken(fake.sdk, request("ada", true)),
  ).rejects.toMatchObject({ code: "SESSION_CHANGED" });
});

test("a renewal that leaves no access token is TOKEN_FAILED", async () => {
  const fake = createFakeOktaAuth();

  await fake.signIn("ada");

  fake.sdk.tokenManager.renew = async () => {
    await fake.removeAccessToken();

    return undefined;
  };

  await expect(
    getSessionAccessToken(fake.sdk, request("ada", true)),
  ).rejects.toMatchObject({
    code: "TOKEN_FAILED",
    message: "okta-auth-js renewed no access token.",
  });
});

test("a renewal Okta answers with login_required is INTERACTION_REQUIRED, and any other failure is kept", async () => {
  const fake = createFakeOktaAuth();

  const loginRequired = Object.assign(new Error("login_required"), {
    name: "OAuthError",
    errorCode: "login_required",
  });

  await fake.signIn("ada");
  fake.failures.renew = loginRequired;

  await expect(
    getSessionAccessToken(fake.sdk, request("ada", true)),
  ).rejects.toMatchObject({
    code: "INTERACTION_REQUIRED",
    cause: loginRequired,
  });

  const offline = new TypeError("fetch failed");

  await fake.signIn("ada", { sid: "sid_1" });
  fake.failures.renew = offline;

  await expect(
    getSessionAccessToken(fake.sdk, request("ada", true)),
  ).rejects.toBe(offline);
});
