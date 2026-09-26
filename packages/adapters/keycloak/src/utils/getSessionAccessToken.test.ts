import { expect, test } from "vitest";

import { KEYCLOAK_ISSUER, createFakeKeycloak } from "src/fakeKeycloak.fixture";
import { getSessionAccessToken } from "src/utils/getSessionAccessToken";

const request = (subject: string, forceRefresh = false) => ({
  profile: "api",
  forceRefresh,
  session: {
    principal: { authority: KEYCLOAK_ISSUER, subject, tenant: null },
    context: '[null,"sid_1"]',
  },
  signal: new AbortController().signal,
});

test("the held access token is answered as a bearer token once updateToken says it stays valid for 30 seconds", async () => {
  const fake = createFakeKeycloak();

  fake.login("ada");

  await expect(
    getSessionAccessToken(fake.sdk, request("ada")),
  ).resolves.toEqual({
    value: "access.ada.1",
    kind: "access-token",
    scheme: "Bearer",
  });
  expect(fake.updates).toEqual([30]);
});

test("a forced token refreshes with -1 and answers the refreshed token", async () => {
  const fake = createFakeKeycloak();

  fake.login("ada");

  await expect(
    getSessionAccessToken(fake.sdk, request("ada", true)),
  ).resolves.toMatchObject({ value: "access.ada.2" });
  expect(fake.updates).toEqual([-1]);
});

test("another session is refused with SESSION_CHANGED before anything refreshes", async () => {
  const fake = createFakeKeycloak();

  fake.login("grace");

  await expect(
    getSessionAccessToken(fake.sdk, request("ada", true)),
  ).rejects.toMatchObject({ code: "SESSION_CHANGED" });

  fake.sdk.clearToken();

  await expect(
    getSessionAccessToken(fake.sdk, request("ada")),
  ).rejects.toMatchObject({ code: "SESSION_CHANGED" });
  expect(fake.updates).toEqual([]);
});

test("a refresh after which keycloak-js holds another session is SESSION_CHANGED, never that session's token", async () => {
  const fake = createFakeKeycloak();

  fake.login("ada");

  fake.sdk.updateToken = async () => {
    fake.switchSilently("grace");

    return true;
  };

  await expect(
    getSessionAccessToken(fake.sdk, request("ada", true)),
  ).rejects.toMatchObject({ code: "SESSION_CHANGED" });
});

test("without a refresh token the held token is answered as it is, and a forced one is UNSUPPORTED", async () => {
  const fake = createFakeKeycloak();

  fake.login("ada", { refreshable: false });

  await expect(
    getSessionAccessToken(fake.sdk, request("ada")),
  ).resolves.toMatchObject({ value: "access.ada.1" });
  await expect(
    getSessionAccessToken(fake.sdk, request("ada", true)),
  ).rejects.toMatchObject({ code: "UNSUPPORTED" });
  expect(fake.updates).toEqual([]);
});

test("a refresh Keycloak refuses asks for the user with INTERACTION_REQUIRED", async () => {
  const fake = createFakeKeycloak();

  fake.login("ada");
  fake.refuseRefresh();

  await expect(
    getSessionAccessToken(fake.sdk, request("ada", true)),
  ).rejects.toMatchObject({
    code: "INTERACTION_REQUIRED",
    cause: { response: { status: 400 } },
  });
});
