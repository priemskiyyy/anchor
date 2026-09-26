import { expect, test } from "vitest";

import { createFakeClerk } from "src/fakeClerk.fixture";
import { getSessionContext } from "src/utils/getSessionContext";

test("the context fingerprints the active organization, the Clerk session and the actor", () => {
  const fake = createFakeClerk();

  expect(
    getSessionContext(
      fake.signIn("user_ada", {
        organization: "org_acme",
        actor: "user_support",
      }),
    ),
  ).toBe('["org_acme","sess_1","user_support"]');
  expect(getSessionContext(fake.signIn("user_ada"))).toBe(
    '[null,"sess_2",null]',
  );
});
