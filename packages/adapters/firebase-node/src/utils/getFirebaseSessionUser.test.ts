import { expect, test } from "vitest";

import { getFirebaseSessionUser } from "src/utils/getFirebaseSessionUser";

test("the default user is the profile claims under the client adapter's field names, with null for a missing one", () => {
  expect(
    getFirebaseSessionUser({
      aud: "anchor-project",
      uid: "ada",
      email: "ada@example.com",
      email_verified: true,
      name: "Ada",
      picture: "https://example.com/ada.png",
      phone_number: "+15550100",
      firebase: { sign_in_provider: "password" },
    }),
  ).toEqual({
    uid: "ada",
    email: "ada@example.com",
    emailVerified: true,
    displayName: "Ada",
    photoURL: "https://example.com/ada.png",
    phoneNumber: "+15550100",
  });
  expect(
    getFirebaseSessionUser({
      aud: "anchor-project",
      uid: "guest",
      firebase: { sign_in_provider: "anonymous" },
    }),
  ).toEqual({
    uid: "guest",
    email: null,
    emailVerified: false,
    displayName: null,
    photoURL: null,
    phoneNumber: null,
  });
});
