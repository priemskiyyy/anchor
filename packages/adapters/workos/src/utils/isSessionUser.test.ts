import { expect, test } from "vitest";

import { isSessionUser } from "src/utils/isSessionUser";

const user = {
  id: "user_ada",
  email: "ada@example.com",
  emailVerified: true,
  firstName: "Ada",
  lastName: null,
  profilePictureUrl: null,
};

const acme = { organizationId: "org_acme", impersonator: null };

const identity = (subject: string, context: string) => ({
  principal: { authority: "workos", subject, tenant: null },
  context,
});

test("AuthKit's user is the session's when its id and the latest refresh's organization and impersonator all match", () => {
  expect(
    isSessionUser(user, acme, identity("user_ada", '["org_acme",null]')),
  ).toBe(true);
  expect(
    isSessionUser(user, acme, identity("user_ada", '["org_globex",null]')),
  ).toBe(false);
  expect(
    isSessionUser(user, acme, identity("user_grace", '["org_acme",null]')),
  ).toBe(false);
  expect(
    isSessionUser(
      user,
      { organizationId: "org_acme", impersonator: "support@example.com" },
      identity("user_ada", '["org_acme",null]'),
    ),
  ).toBe(false);
});

test("no user, or a user whose refresh was never heard, is nobody's", () => {
  expect(
    isSessionUser(null, acme, identity("user_ada", '["org_acme",null]')),
  ).toBe(false);
  expect(isSessionUser(user, null, identity("user_ada", "[null,null]"))).toBe(
    false,
  );
});
