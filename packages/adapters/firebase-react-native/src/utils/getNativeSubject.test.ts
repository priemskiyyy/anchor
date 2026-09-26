import { expect, test } from "vitest";

import { createFakeFirebaseAuth } from "src/fakeFirebaseAuth.fixture";
import { getNativeSubject } from "src/utils/getNativeSubject";

const getMirroredUser = (fake: ReturnType<typeof createFakeFirebaseAuth>) => {
  const user = fake.sdk.currentUser;

  if (user === null) {
    throw new Error("Expected a mirrored user.");
  }

  return user;
};

test("the subject is the user the native SDK holds, even when JavaScript still mirrors another", async () => {
  const fake = createFakeFirebaseAuth();

  fake.signIn("ada");

  const mirrored = getMirroredUser(fake);

  fake.switchNatively("grace");

  await expect(getNativeSubject(mirrored)).resolves.toBe("grace");
});

test("a native SDK that holds no user answers no subject", async () => {
  const fake = createFakeFirebaseAuth();

  fake.signIn("ada");

  const mirrored = getMirroredUser(fake);

  fake.signOutNatively();

  await expect(getNativeSubject(mirrored)).resolves.toBe(null);
});

test("a token that cannot be read falls back to the mirrored user", async () => {
  const fake = createFakeFirebaseAuth();

  fake.signIn("ada");
  fake.failures.token = { code: "auth/network-request-failed" };

  await expect(getNativeSubject(getMirroredUser(fake))).resolves.toBe("ada");
});
