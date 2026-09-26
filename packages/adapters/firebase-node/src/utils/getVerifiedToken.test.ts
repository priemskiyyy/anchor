import { expect, test } from "vitest";

import { createFakeFirebaseAuth } from "src/fakeFirebaseAuth.fixture";
import { getVerifiedToken } from "src/utils/getVerifiedToken";

test("an ID token and a session cookie are each verified by their own call, revocation checked as asked", async () => {
  const fake = createFakeFirebaseAuth();
  const { sessionCookie, idToken } = fake.signIn("ada");

  await expect(
    getVerifiedToken(fake.sdk, { kind: "id-token", value: idToken }, false),
  ).resolves.toMatchObject({ uid: "ada" });
  await expect(
    getVerifiedToken(
      fake.sdk,
      { kind: "session-cookie", value: sessionCookie },
      true,
    ),
  ).resolves.toMatchObject({ uid: "ada" });
  expect(fake.calls).toEqual([
    ["verifyIdToken", idToken, false],
    ["verifySessionCookie", sessionCookie, true],
  ]);
});

test("a credential Firebase refuses is no session, and any other failure is thrown as it came", async () => {
  const fake = createFakeFirebaseAuth();
  const { idToken } = fake.signIn("ada");

  fake.expire(idToken);

  await expect(
    getVerifiedToken(fake.sdk, { kind: "id-token", value: idToken }, false),
  ).resolves.toBe(null);

  const failure = new Error("The Google keys could not be fetched.");

  fake.failures.verify = failure;

  await expect(
    getVerifiedToken(fake.sdk, { kind: "id-token", value: idToken }, false),
  ).rejects.toBe(failure);
});
