import { expect, test } from "vitest";

import { getBetterAuthSessionUser } from "src/utils/getBetterAuthSessionUser";

test("the default user is the core user fields under Better Auth's names, without dates or plugin fields, and null for a missing image", () => {
  const user = {
    id: "user_ada",
    name: "Ada",
    email: "ada@example.com",
    emailVerified: true,
    isAnonymous: false,
    role: "admin",
    createdAt: new Date(0),
    updatedAt: new Date(0),
  };

  expect(getBetterAuthSessionUser(user)).toEqual({
    id: "user_ada",
    name: "Ada",
    email: "ada@example.com",
    emailVerified: true,
    image: null,
  });
  expect(
    getBetterAuthSessionUser({ ...user, image: "https://example.com/ada.png" }),
  ).toMatchObject({ image: "https://example.com/ada.png" });
});
