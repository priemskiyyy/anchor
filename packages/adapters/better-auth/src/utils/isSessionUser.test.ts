import { expect, test } from "vitest";

import { isSessionUser } from "src/utils/isSessionUser";

const identity = (subject: string, context: string | null) => ({
  principal: { authority: "better-auth", subject, tenant: null },
  context,
});

test("the current session is the session's when its user and its context both match", () => {
  const data = {
    user: {
      id: "user_ada",
      name: "Ada",
      email: "ada@example.com",
      emailVerified: true,
    },
    session: { id: "session_1", activeOrganizationId: "org_acme" },
  };

  expect(
    isSessionUser(data, identity("user_ada", '["org_acme",null,"session_1"]')),
  ).toBe(true);
  expect(
    isSessionUser(
      data,
      identity("user_ada", '["org_globex",null,"session_1"]'),
    ),
  ).toBe(false);
  expect(
    isSessionUser(
      data,
      identity("user_grace", '["org_acme",null,"session_1"]'),
    ),
  ).toBe(false);
  expect(isSessionUser(null, identity("user_ada", null))).toBe(false);
});
