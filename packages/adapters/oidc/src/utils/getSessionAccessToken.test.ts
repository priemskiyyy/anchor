import { expect, test } from "vitest";

import {
  OIDC_ISSUER,
  createFakeUserManager,
} from "src/fakeUserManager.fixture";
import { getSessionAccessToken } from "src/utils/getSessionAccessToken";

const request = (subject: string, forceRefresh = false) => ({
  profile: "api",
  forceRefresh,
  session: {
    principal: { authority: OIDC_ISSUER, subject, tenant: null },
    context: '[null,null,"sid_1",null]',
  },
  signal: new AbortController().signal,
});

test("the stored access token is answered with its token type as the scheme while it has not expired", async () => {
  const fake = createFakeUserManager();

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

test("the scheme is the token type the provider answered, such as DPoP", async () => {
  const fake = createFakeUserManager();

  await fake.signIn("ada", { tokenType: "DPoP" });

  await expect(
    getSessionAccessToken(fake.sdk, request("ada")),
  ).resolves.toEqual({
    value: "access.ada.1",
    kind: "access-token",
    scheme: "DPoP",
  });
});

test("an expired or a forced token renews through signinSilent and answers the renewed user's token", async () => {
  const fake = createFakeUserManager();

  await fake.signIn("ada");
  fake.expire();

  await expect(
    getSessionAccessToken(fake.sdk, request("ada")),
  ).resolves.toMatchObject({ value: "access.ada.2" });
  await expect(
    getSessionAccessToken(fake.sdk, request("ada", true)),
  ).resolves.toMatchObject({ value: "access.ada.3" });
  expect(fake.renewals).toEqual(["ada", "ada"]);
});

test("another user is refused with SESSION_CHANGED before anything renews", async () => {
  const fake = createFakeUserManager();

  await fake.signIn("grace");

  await expect(
    getSessionAccessToken(fake.sdk, request("ada", true)),
  ).rejects.toMatchObject({ code: "SESSION_CHANGED" });
  expect(fake.renewals).toEqual([]);

  await fake.sdk.removeUser();

  await expect(
    getSessionAccessToken(fake.sdk, request("ada")),
  ).rejects.toMatchObject({ code: "SESSION_CHANGED" });
});

test("a renewal that answers another subject is SESSION_CHANGED, never that subject's token", async () => {
  const fake = createFakeUserManager();

  await fake.signIn("ada");
  fake.renewing.subject = "grace";

  await expect(
    getSessionAccessToken(fake.sdk, request("ada", true)),
  ).rejects.toMatchObject({ code: "SESSION_CHANGED" });
  expect(fake.renewals).toEqual(["grace"]);
});

test("a renewal the provider answers with login_required is INTERACTION_REQUIRED", async () => {
  const fake = createFakeUserManager();

  const error = Object.assign(new Error("login_required"), {
    error: "login_required",
  });

  await fake.signIn("ada");
  fake.failures.renew = error;

  await expect(
    getSessionAccessToken(fake.sdk, request("ada", true)),
  ).rejects.toMatchObject({ code: "INTERACTION_REQUIRED", cause: error });
});
