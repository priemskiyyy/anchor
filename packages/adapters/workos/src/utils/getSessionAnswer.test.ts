import { expect, test } from "vitest";

import { getSessionAnswer } from "src/utils/getSessionAnswer";

const user = {
  id: "user_ada",
  email: "ada@example.com",
  emailVerified: true,
  firstName: "Ada",
  lastName: null,
  profilePictureUrl: null,
};

test("no user is signed out", () => {
  expect(getSessionAnswer(null, null, ({ id }) => id)).toEqual({
    status: "signed-out",
  });
});

test("a user is signed in as its id, in the organization of the latest refresh, and impersonated while someone impersonates it", () => {
  expect(
    getSessionAnswer(
      user,
      { organizationId: "org_acme", impersonator: "support@example.com" },
      ({ id }) => ({ id }),
    ),
  ).toEqual({
    status: "signed-in",
    principal: { authority: "workos", subject: "user_ada", tenant: null },
    user: { id: "user_ada" },
    context: '["org_acme","support@example.com"]',
    guest: false,
    impersonated: true,
  });
  expect(
    getSessionAnswer(
      user,
      { organizationId: null, impersonator: null },
      ({ id }) => id,
    ),
  ).toMatchObject({ context: "[null,null]", impersonated: false });
});

test("a user whose refresh the adapter never heard is refused, since its organization is unknown", () => {
  expect(() => getSessionAnswer(user, null, ({ id }) => id)).toThrow(
    new TypeError(
      "AuthKit holds a user whose refresh the adapter never heard: pass refreshes.handleRefresh to createClient() as onRefresh.",
    ),
  );
});
