import { expect, test } from "vitest";

import { getAuthjsSessionUser } from "src/utils/getAuthjsSessionUser";

test("the default user is the session's user under Auth.js's names, with null for a field it lacks", () => {
  expect(
    getAuthjsSessionUser({
      user: { id: "user_ada", name: "Ada", email: "ada@example.com" },
    }),
  ).toEqual({
    id: "user_ada",
    name: "Ada",
    email: "ada@example.com",
    image: null,
  });
  expect(getAuthjsSessionUser({})).toEqual({
    id: "",
    name: null,
    email: null,
    image: null,
  });
});
