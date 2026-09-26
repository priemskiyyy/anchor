import { expect, test } from "vitest";

import {
  LOGOUT_URL,
  OKTA_ISSUER,
  createFakeOktaAuth,
} from "src/fakeOktaAuth.fixture";
import { signOutSession } from "src/utils/signOutSession";

const request = (subject: string) => ({
  session: {
    principal: { authority: OKTA_ISSUER, subject, tenant: null },
    context: "sid_1",
  },
  signal: new AbortController().signal,
});

test("the session's own tokens are revoked, refresh token first, then cleared, and the sign-out page is handed back", async () => {
  const fake = createFakeOktaAuth();

  await fake.signIn("ada");

  await expect(signOutSession(fake.sdk, request("ada"))).resolves.toEqual({
    local: "completed",
    remote: "unknown",
    navigation: { url: `${LOGOUT_URL}?id_token_hint=id.ada.1` },
  });
  expect(fake.revocations).toEqual([
    "refresh refresh.ada.1",
    "access access.ada.1",
  ]);
  expect(fake.tokens()).toEqual({});
});

test("another session is never revoked or cleared: the ending does not apply", async () => {
  const fake = createFakeOktaAuth();

  await fake.signIn("grace");

  await expect(signOutSession(fake.sdk, request("ada"))).resolves.toEqual({
    local: "not-applicable",
    remote: "not-applicable",
    navigation: null,
  });
  expect(fake.revocations).toEqual([]);
  expect(fake.tokens().idToken?.claims.sub).toBe("grace");
});

test("a session replaced while its tokens were revoked is left to the new one", async () => {
  const fake = createFakeOktaAuth();

  await fake.signIn("ada");

  const revokeRefreshToken = fake.sdk.revokeRefreshToken;

  fake.sdk.revokeRefreshToken = async (token) => {
    fake.switchSilently("grace");

    return revokeRefreshToken(token);
  };

  await expect(signOutSession(fake.sdk, request("ada"))).resolves.toEqual({
    local: "not-applicable",
    remote: "unknown",
    navigation: null,
  });
  expect(fake.tokens().idToken?.claims.sub).toBe("grace");
});

test("an okta-auth-js without getSignOutRedirectUrl clears the tokens and leaves Okta's session unknown", async () => {
  const fake = createFakeOktaAuth({ signOutRedirectUrl: false });

  await fake.signIn("ada");

  await expect(signOutSession(fake.sdk, request("ada"))).resolves.toEqual({
    local: "completed",
    remote: "unknown",
    navigation: null,
  });
  expect(fake.tokens()).toEqual({});
});

test("a revocation that fails is thrown as okta-auth-js threw it, and nothing is cleared", async () => {
  const fake = createFakeOktaAuth();
  const failure = new TypeError("fetch failed");

  await fake.signIn("ada");
  fake.failures.revoke = failure;

  await expect(signOutSession(fake.sdk, request("ada"))).rejects.toBe(failure);
  expect(fake.tokens().idToken?.claims.sub).toBe("ada");
});
