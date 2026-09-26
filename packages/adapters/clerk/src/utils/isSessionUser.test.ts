import { expect, test } from "vitest";

import { createFakeClerk } from "src/fakeClerk.fixture";
import { isSessionUser } from "src/utils/isSessionUser";

const identity = (subject: string, context: string) => ({
  principal: { authority: "https://clerk.example.com", subject, tenant: null },
  context,
});

test("Clerk's active session is the session's when its user and its context both match", () => {
  const fake = createFakeClerk();
  const session = fake.signIn("user_ada", { organization: "org_acme" });

  expect(
    isSessionUser(session, identity("user_ada", '["org_acme","sess_1",null]')),
  ).toBe(true);
  expect(
    isSessionUser(
      session,
      identity("user_ada", '["org_globex","sess_1",null]'),
    ),
  ).toBe(false);
  expect(
    isSessionUser(session, identity("user_ada", '["org_acme","sess_2",null]')),
  ).toBe(false);
  expect(
    isSessionUser(
      session,
      identity("user_grace", '["org_acme","sess_1",null]'),
    ),
  ).toBe(false);
});

test("no session, or one Clerk is still switching to, is nobody's", () => {
  expect(
    isSessionUser(null, identity("user_ada", '[null,"sess_1",null]')),
  ).toBe(false);
  expect(
    isSessionUser(undefined, identity("user_ada", '[null,"sess_1",null]')),
  ).toBe(false);
});
