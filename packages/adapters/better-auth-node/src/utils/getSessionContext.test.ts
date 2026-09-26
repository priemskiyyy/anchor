import { expect, test } from "vitest";

import { getSessionContext } from "src/utils/getSessionContext";

const user = {
  id: "user_ada",
  name: "Ada",
  email: "ada@example.com",
  emailVerified: true,
};

test("the context fingerprints the active organization, the active team and the Better Auth session", () => {
  expect(
    getSessionContext({
      user,
      session: {
        id: "session_1",
        activeOrganizationId: "org_acme",
        activeTeamId: "team_red",
      },
    }),
  ).toBe('["org_acme","team_red","session_1"]');
  expect(
    getSessionContext({
      user,
      session: { id: "session_1", activeOrganizationId: null },
    }),
  ).toBe('[null,null,"session_1"]');
});
