import { expect, test } from "vitest";

import { getWorkosSessionUser } from "src/utils/getWorkosSessionUser";

test("the default user is the profile fields under WorkOS's names, with null for a missing external id", () => {
  const user = {
    object: "user",
    id: "user_ada",
    email: "ada@example.com",
    emailVerified: true,
    firstName: "Ada",
    lastName: "Lovelace",
    profilePictureUrl: "https://example.com/ada.png",
    metadata: { plan: "team" },
  };

  expect(getWorkosSessionUser({ ...user, externalId: "ext_ada" })).toEqual({
    id: "user_ada",
    email: "ada@example.com",
    emailVerified: true,
    firstName: "Ada",
    lastName: "Lovelace",
    profilePictureUrl: "https://example.com/ada.png",
    externalId: "ext_ada",
  });
  expect(getWorkosSessionUser(user)).toMatchObject({ externalId: null });
});
