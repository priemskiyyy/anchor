import { expect, test } from "vitest";

import { getClerkSessionUser } from "src/utils/getClerkSessionUser";

test("the default user is the profile fields under Clerk's names, with the primary email address and phone number as strings, or null", () => {
  const user = {
    id: "user_ada",
    externalId: "ext_ada",
    username: "ada",
    firstName: "Ada",
    lastName: "Lovelace",
    fullName: "Ada Lovelace",
    imageUrl: "https://img.clerk.com/ada.png",
    primaryEmailAddress: { emailAddress: "ada@example.com" },
    primaryPhoneNumber: { phoneNumber: "+15550100" },
    publicMetadata: { role: "admin" },
  };

  expect(getClerkSessionUser(user)).toEqual({
    id: "user_ada",
    externalId: "ext_ada",
    username: "ada",
    firstName: "Ada",
    lastName: "Lovelace",
    fullName: "Ada Lovelace",
    imageUrl: "https://img.clerk.com/ada.png",
    primaryEmailAddress: "ada@example.com",
    primaryPhoneNumber: "+15550100",
  });
  expect(
    getClerkSessionUser({
      ...user,
      primaryEmailAddress: null,
      primaryPhoneNumber: null,
    }),
  ).toMatchObject({ primaryEmailAddress: null, primaryPhoneNumber: null });
});
