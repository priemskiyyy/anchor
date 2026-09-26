import { expect, test } from "vitest";

import { createFakeFirebaseAuth } from "src/fakeFirebaseAuth.fixture";
import { getSessionIdToken } from "src/utils/getSessionIdToken";

const request = (
  subject: string,
  forceRefresh = false,
  tenant: string | null = null,
) => ({
  profile: "api",
  forceRefresh,
  session: {
    principal: {
      authority: "https://securetoken.google.com/demo",
      subject,
      tenant,
    },
    context: null,
  },
  signal: new AbortController().signal,
});

test("the ID token the native SDK mints for the session's user is answered, forced as asked", async () => {
  const fake = createFakeFirebaseAuth();

  fake.signIn("ada");

  await expect(
    getSessionIdToken(fake.sdk, request("ada", true)),
  ).resolves.toEqual({
    value: "id-token.ada.1",
    kind: "id-token",
    scheme: "Bearer",
  });
  expect(fake.mints).toEqual([{ uid: "ada", forceRefresh: true }]);
});

test("another user, another tenant or none in JavaScript is refused with SESSION_CHANGED before anything is minted", async () => {
  const fake = createFakeFirebaseAuth();

  await expect(
    getSessionIdToken(fake.sdk, request("ada")),
  ).rejects.toMatchObject({ code: "SESSION_CHANGED" });

  fake.signIn("grace");

  await expect(
    getSessionIdToken(fake.sdk, request("ada")),
  ).rejects.toMatchObject({ code: "SESSION_CHANGED" });
  await expect(
    getSessionIdToken(fake.sdk, request("grace", false, "acme")),
  ).rejects.toMatchObject({ code: "SESSION_CHANGED" });
  expect(fake.mints).toEqual([]);
});

test("a token the native SDK minted for another user than JavaScript holds is SESSION_CHANGED, never that user's token", async () => {
  const fake = createFakeFirebaseAuth();

  fake.signIn("ada");
  fake.switchNatively("grace");

  await expect(
    getSessionIdToken(fake.sdk, request("ada")),
  ).rejects.toMatchObject({
    code: "SESSION_CHANGED",
    message: "Firebase holds another user than the session asked for.",
  });
  expect(fake.mints).toEqual([{ uid: "grace", forceRefresh: false }]);
});

test("a failure to mint is mapped, and the native SDK holding no user is SESSION_CHANGED", async () => {
  const fake = createFakeFirebaseAuth();

  fake.signIn("ada");
  fake.signOutNatively();

  await expect(
    getSessionIdToken(fake.sdk, request("ada")),
  ).rejects.toMatchObject({
    code: "SESSION_CHANGED",
    cause: { code: "auth/no-current-user" },
  });

  const offline = { code: "auth/network-request-failed" };

  fake.signIn("ada");
  fake.failures.token = offline;

  await expect(getSessionIdToken(fake.sdk, request("ada"))).rejects.toBe(
    offline,
  );
});
