import { expect, test } from "vitest";

import { getSessionAnswer } from "src/utils/getSessionAnswer";

const user = {
  id: "user_ada",
  name: "Ada",
  email: "ada@example.com",
  emailVerified: true,
};

test("no session is signed out", () => {
  expect(getSessionAnswer(null, ({ id }) => id)).toEqual({
    status: "signed-out",
  });
});

test("a session is signed in as its user, a guest when anonymous, impersonated when an admin impersonates", () => {
  expect(
    getSessionAnswer(
      {
        user: { ...user, isAnonymous: true },
        session: { id: "session_1", impersonatedBy: "user_admin" },
      },
      ({ id }) => ({ id }),
    ),
  ).toEqual({
    status: "signed-in",
    principal: { authority: "better-auth", subject: "user_ada", tenant: null },
    user: { id: "user_ada" },
    context: '[null,null,"session_1"]',
    guest: true,
    impersonated: true,
  });
  expect(
    getSessionAnswer(
      {
        user: { ...user, isAnonymous: null },
        session: { id: "session_1", impersonatedBy: null },
      },
      ({ id }) => id,
    ),
  ).toMatchObject({ guest: false, impersonated: false });
});
