import { expect, test } from "vitest";

import { createFakeFirebaseAuth } from "src/fakeFirebaseAuth.fixture";
import { getFirebaseSessionUser } from "src/utils/getFirebaseSessionUser";

test("the default user is a plain snapshot of the profile fields under Firebase's names, without the SDK's methods", () => {
  const fake = createFakeFirebaseAuth();

  fake.signIn("ada");

  const user = fake.current();

  if (user === null) {
    throw new Error("Expected a user.");
  }

  expect(getFirebaseSessionUser(user)).toEqual({
    uid: "ada",
    email: "ada@example.com",
    emailVerified: true,
    displayName: "ADA",
    photoURL: null,
    phoneNumber: null,
  });
  expect(Object.keys(getFirebaseSessionUser(user)).sort()).toEqual([
    "displayName",
    "email",
    "emailVerified",
    "phoneNumber",
    "photoURL",
    "uid",
  ]);
});
