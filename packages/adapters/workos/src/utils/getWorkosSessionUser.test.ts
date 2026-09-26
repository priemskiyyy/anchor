import { expect, test } from "vitest";

import { getWorkosSessionUser } from "src/utils/getWorkosSessionUser";

test("the default user is the profile fields under AuthKit's names, without its dates, and null for a missing external id", () => {
  const user = {
    object: "user",
    id: "user_ada",
    email: "ada@example.com",
    emailVerified: true,
    firstName: "Ada",
    lastName: null,
    profilePictureUrl: null,
    lastSignInAt: "2026-09-01T00:00:00.000Z",
    externalId: undefined,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };

  expect(getWorkosSessionUser(user)).toEqual({
    id: "user_ada",
    email: "ada@example.com",
    emailVerified: true,
    firstName: "Ada",
    lastName: null,
    profilePictureUrl: null,
    externalId: null,
  });
  expect(getWorkosSessionUser({ ...user, externalId: "ada-42" })).toMatchObject(
    { externalId: "ada-42" },
  );
});
