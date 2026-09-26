import { expect, test } from "vitest";

import { getClerkSessionUser } from "src/utils/getClerkSessionUser";

const user = {
  id: "user_ada",
  externalId: "ada-42",
  username: "ada",
  firstName: "Ada",
  lastName: "Lovelace",
  fullName: "Ada Lovelace",
  imageUrl: "https://img.clerk.com/ada",
  primaryEmailAddress: { id: "idn_1", emailAddress: "ada@example.com" },
  primaryPhoneNumber: { id: "idn_2", phoneNumber: "+15555550100" },
  publicMetadata: { role: "admin" },
  createdAt: new Date(0),
};

test("the default user is the profile fields under Clerk's names, with the primary email address and phone number as their strings", () => {
  expect(getClerkSessionUser(user)).toEqual({
    id: "user_ada",
    externalId: "ada-42",
    username: "ada",
    firstName: "Ada",
    lastName: "Lovelace",
    fullName: "Ada Lovelace",
    imageUrl: "https://img.clerk.com/ada",
    primaryEmailAddress: "ada@example.com",
    primaryPhoneNumber: "+15555550100",
  });
});

test("a user without a primary email address or phone number has null for them", () => {
  expect(
    getClerkSessionUser({
      ...user,
      primaryEmailAddress: null,
      primaryPhoneNumber: null,
    }),
  ).toMatchObject({ primaryEmailAddress: null, primaryPhoneNumber: null });
});
