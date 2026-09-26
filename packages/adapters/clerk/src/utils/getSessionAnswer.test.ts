import { expect, test } from "vitest";

import { CLERK_FRONTEND_API, createFakeClerk } from "src/fakeClerk.fixture";
import { getSessionAnswer } from "src/utils/getSessionAnswer";

test("no active session is signed out", () => {
  expect(getSessionAnswer(CLERK_FRONTEND_API, null, ({ id }) => id)).toEqual({
    status: "signed-out",
  });
});

test("an active session is signed in as its user, issued by the Frontend API, and impersonated when it names an actor", () => {
  const fake = createFakeClerk();

  const session = fake.signIn("user_ada", {
    organization: "org_acme",
    actor: "user_support",
  });

  expect(
    getSessionAnswer(CLERK_FRONTEND_API, session, ({ id }) => ({ id })),
  ).toEqual({
    status: "signed-in",
    principal: {
      authority: "https://clerk.example.com",
      subject: "user_ada",
      tenant: null,
    },
    user: { id: "user_ada" },
    context: '["org_acme","sess_1","user_support"]',
    guest: false,
    impersonated: true,
  });
  expect(
    getSessionAnswer(
      CLERK_FRONTEND_API,
      fake.signIn("user_ada"),
      ({ id }) => id,
    ),
  ).toMatchObject({ status: "signed-in", impersonated: false });
});

test("a pending session requires its current task, under Clerk's name for it", () => {
  const fake = createFakeClerk();

  expect(
    getSessionAnswer(
      CLERK_FRONTEND_API,
      fake.signIn("user_ada", { task: "choose-organization" }),
      ({ id }) => id,
    ),
  ).toEqual({
    status: "action-required",
    action: { kind: "choose-organization" },
    principal: {
      authority: "https://clerk.example.com",
      subject: "user_ada",
      tenant: null,
    },
    user: "user_ada",
    context: '[null,"sess_1",null]',
    guest: false,
    impersonated: false,
  });
});
