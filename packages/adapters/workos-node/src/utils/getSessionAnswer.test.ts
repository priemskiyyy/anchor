import { expect, test } from "vitest";

import { getSessionAnswer } from "src/utils/getSessionAnswer";

const user = {
  id: "user_ada",
  email: "ada@example.com",
  emailVerified: true,
  firstName: "Ada",
  lastName: "Lovelace",
  profilePictureUrl: null,
};

test("a WorkOS session is signed in as its user under the workos authority, fingerprinting its organization and impersonator", () => {
  expect(
    getSessionAnswer({ sessionId: "session_1", user }, ({ id }) => ({ id })),
  ).toEqual({
    status: "signed-in",
    principal: { authority: "workos", subject: "user_ada", tenant: null },
    user: { id: "user_ada" },
    context: "[null,null]",
    guest: false,
    impersonated: false,
  });
  expect(
    getSessionAnswer(
      {
        sessionId: "session_1",
        organizationId: "org_acme",
        impersonator: { email: "support@example.com" },
        user,
      },
      ({ id }) => id,
    ),
  ).toMatchObject({
    context: '["org_acme","support@example.com"]',
    impersonated: true,
  });
});
