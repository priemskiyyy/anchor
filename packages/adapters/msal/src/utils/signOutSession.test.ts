import { expect, test } from "vitest";

import {
  MSAL_ENVIRONMENT,
  MSAL_TENANT,
  createFakePublicClientApplication,
} from "src/fakePublicClientApplication.fixture";
import { signOutSession } from "src/utils/signOutSession";

const request = (subject: string) => ({
  session: {
    principal: { authority: MSAL_ENVIRONMENT, subject, tenant: MSAL_TENANT },
    context: "sid_1",
  },
  signal: new AbortController().signal,
});

test("only the session's account is cleared from MSAL's cache, and the Microsoft Entra session is unknown with no page", async () => {
  const fake = createFakePublicClientApplication();
  const ada = fake.signIn("ada");

  fake.login("grace");

  await expect(signOutSession(fake.sdk, request("ada"))).resolves.toEqual({
    local: "completed",
    remote: "unknown",
    navigation: null,
  });
  expect(fake.clearedAccounts).toEqual([ada]);
  expect(fake.sdk.getActiveAccount()).toBe(null);
  expect(
    fake.sdk.getAllAccounts().map(({ homeAccountId }) => homeAccountId),
  ).toEqual(["grace"]);
});

test("another active account, or none, is never cleared: the ending does not apply", async () => {
  const fake = createFakePublicClientApplication();

  fake.signIn("grace");

  await expect(signOutSession(fake.sdk, request("ada"))).resolves.toEqual({
    local: "not-applicable",
    remote: "not-applicable",
    navigation: null,
  });

  fake.sdk.setActiveAccount(null);

  await expect(signOutSession(fake.sdk, request("grace"))).resolves.toEqual({
    local: "not-applicable",
    remote: "not-applicable",
    navigation: null,
  });
  expect(fake.clearedAccounts).toEqual([]);
});
