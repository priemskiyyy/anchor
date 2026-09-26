import { expect, test } from "vitest";

import {
  COGNITO_ISSUER,
  createFakeAmplifyAuth,
} from "src/fakeAmplifyAuth.fixture";
import { signOutSession } from "src/utils/signOutSession";

const request = (subject: string) => ({
  session: {
    principal: { authority: COGNITO_ISSUER, subject, tenant: null },
    context: "origin_1",
  },
  signal: new AbortController().signal,
});

test("the session's own user is signed out of this device only, and ending is complete locally once Amplify dispatched signedOut", async () => {
  const fake = createFakeAmplifyAuth();

  fake.signIn("ada");

  await expect(signOutSession(fake.sdk, request("ada"))).resolves.toEqual({
    local: "completed",
    remote: "unknown",
    navigation: null,
  });
  expect(fake.signOuts).toEqual([{ global: false }]);
  expect(fake.session()).toBe(null);
  expect(fake.listeners()).toBe(0);
});

test("a signOut() that returns without signing out, as a closed hosted UI logout page on React Native, leaves the local outcome unknown", async () => {
  const fake = createFakeAmplifyAuth();

  fake.signIn("ada");
  fake.closeLogoutPage();

  await expect(signOutSession(fake.sdk, request("ada"))).resolves.toEqual({
    local: "unknown",
    remote: "unknown",
    navigation: null,
  });
  expect(fake.session()?.user.userId).toBe("ada");
  expect(fake.listeners()).toBe(0);
});

test("an auth event other than signedOut during the sign-out proves nothing, so the local outcome stays unknown", async () => {
  const fake = createFakeAmplifyAuth();

  fake.signIn("ada");

  const sdk = {
    ...fake.sdk,
    auth: {
      ...fake.sdk.auth,
      signOut: async () => {
        fake.dispatch("tokenRefresh");
      },
    },
  };

  await expect(signOutSession(sdk, request("ada"))).resolves.toEqual({
    local: "unknown",
    remote: "unknown",
    navigation: null,
  });
});

test("another user, or none, is never signed out: the ending does not apply", async () => {
  const fake = createFakeAmplifyAuth();

  fake.signIn("grace");

  await expect(signOutSession(fake.sdk, request("ada"))).resolves.toEqual({
    local: "not-applicable",
    remote: "not-applicable",
    navigation: null,
  });

  fake.switchSilently("ada", { originJti: null });

  await expect(signOutSession(fake.sdk, request("ada"))).resolves.toEqual({
    local: "not-applicable",
    remote: "not-applicable",
    navigation: null,
  });
  expect(fake.signOuts).toEqual([]);
});

test("a sign-out that fails is thrown as Amplify threw it, and the listener for it is removed", async () => {
  const fake = createFakeAmplifyAuth();

  const failure = Object.assign(new Error("OAuth sign-out failed"), {
    name: "OAuthSignOutException",
  });

  fake.signIn("ada");
  fake.failures.signOut = failure;

  await expect(signOutSession(fake.sdk, request("ada"))).rejects.toBe(failure);
  expect(fake.session()?.user.userId).toBe("ada");
  expect(fake.listeners()).toBe(0);
});
