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

  const snapshot = getFirebaseSessionUser(user);

  expect(snapshot).toEqual({
    uid: "ada",
    email: "ada@example.com",
    emailVerified: true,
    displayName: "ADA",
    photoURL: null,
    phoneNumber: null,
  });
  expect(Object.keys(snapshot).sort()).toEqual([
    "displayName",
    "email",
    "emailVerified",
    "phoneNumber",
    "photoURL",
    "uid",
  ]);
});

test("every profile field is copied as the Firebase user holds it", () => {
  expect(
    getFirebaseSessionUser({
      uid: "ada",
      isAnonymous: false,
      tenantId: "acme",
      email: "ada@example.com",
      emailVerified: false,
      displayName: "Ada Lovelace",
      photoURL: "https://cdn.example.com/ada.png",
      phoneNumber: "+15555550100",
      getIdTokenResult: async () => ({ token: "id-token", claims: {} }),
    }),
  ).toEqual({
    uid: "ada",
    email: "ada@example.com",
    emailVerified: false,
    displayName: "Ada Lovelace",
    photoURL: "https://cdn.example.com/ada.png",
    phoneNumber: "+15555550100",
  });
});
