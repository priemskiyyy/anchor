import { expect, test } from "vitest";

import {
  COGNITO_ISSUER,
  createFakeAmplifyAuth,
} from "src/fakeAmplifyAuth.fixture";
import { getCurrentSession } from "src/utils/getCurrentSession";

test("the signed-in user and the ID token of the same session are answered together", async () => {
  const fake = createFakeAmplifyAuth();

  fake.signIn("ada", { originJti: "origin_a" });

  const session = await getCurrentSession(fake.sdk);

  expect(session?.user).toEqual({
    username: "ada",
    userId: "ada",
    signInDetails: {
      loginId: "ada@example.com",
      authFlowType: "USER_SRP_AUTH",
    },
  });
  expect(session?.idToken.payload).toEqual({
    iss: COGNITO_ISSUER,
    sub: "ada",
    origin_jti: "origin_a",
  });
  expect(fake.sessionRequests).toEqual([{ forceRefresh: false }]);
});

test("no user is null on getCurrentUser's own word, without asking for the session's tokens", async () => {
  const fake = createFakeAmplifyAuth();

  await expect(getCurrentSession(fake.sdk)).resolves.toBe(null);
  expect(fake.sessionRequests).toEqual([]);
});

test("an Amplify without a configured user pool throws what getCurrentUser threw, never null", async () => {
  const fake = createFakeAmplifyAuth({ configured: false });

  await expect(getCurrentSession(fake.sdk)).rejects.toMatchObject({
    name: "AuthUserPoolException",
  });
});

test("only an Error named UserUnAuthenticatedException is Amplify's word, so any other thrown value is thrown as it is", async () => {
  const fake = createFakeAmplifyAuth();
  const thrown = { name: "UserUnAuthenticatedException" };

  const sdk = {
    ...fake.sdk,
    auth: {
      ...fake.sdk.auth,
      getCurrentUser: async () => {
        throw thrown;
      },
    },
  };

  await expect(getCurrentSession(sdk)).rejects.toBe(thrown);
});

test("a user without an ID token cannot be named, so the read throws", async () => {
  const fake = createFakeAmplifyAuth();

  fake.signIn("ada", { idToken: false });

  const read = getCurrentSession(fake.sdk);

  await expect(read).rejects.toThrow(TypeError);
  await expect(read).rejects.toThrow(
    "Amplify holds a signed-in user but no ID token to name it: request the openid scope.",
  );
});

test("a user switched between getCurrentUser and fetchAuthSession throws instead of mixing two users", async () => {
  const fake = createFakeAmplifyAuth();

  fake.signIn("ada");

  const sdk = {
    ...fake.sdk,
    auth: {
      ...fake.sdk.auth,
      getCurrentUser: async () => {
        const user = await fake.sdk.auth.getCurrentUser();

        fake.switchSilently("grace");

        return user;
      },
    },
  };

  await expect(getCurrentSession(sdk)).rejects.toThrow(
    "Amplify switched users while the session was read.",
  );
});
