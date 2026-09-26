import { expect, test } from "vitest";

import { createFakeFirebaseAuth } from "src/fakeFirebaseAuth.fixture";
import { getSessionIdToken } from "src/utils/getSessionIdToken";

const request = (subject: string, forceRefresh = false) => ({
  profile: "api",
  forceRefresh,
  session: {
    principal: {
      authority: "https://securetoken.google.com/demo",
      subject,
      tenant: null,
    },
    context: null,
  },
  signal: new AbortController().signal,
});

test("the current user's ID token is minted when the SDK holds the session's user, forced as asked", async () => {
  const fake = createFakeFirebaseAuth();

  fake.signIn("ada");

  await expect(
    getSessionIdToken(fake.sdk, request("ada", true)),
  ).resolves.toEqual({
    value: "id-token.ada.1",
    kind: "id-token",
    scheme: "Bearer",
  });
  expect(fake.current()?.minted).toEqual({ count: 1, forced: 1 });
});

test("another user, or none, is refused with SESSION_CHANGED before anything is minted", async () => {
  const fake = createFakeFirebaseAuth();

  await expect(
    getSessionIdToken(fake.sdk, request("ada")),
  ).rejects.toMatchObject({
    code: "SESSION_CHANGED",
  });

  fake.signIn("grace");

  await expect(
    getSessionIdToken(fake.sdk, request("ada")),
  ).rejects.toMatchObject({
    code: "SESSION_CHANGED",
  });
  expect(fake.current()?.minted.count).toBe(0);
});
