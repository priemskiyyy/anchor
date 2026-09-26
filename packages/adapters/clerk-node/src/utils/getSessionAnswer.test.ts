import { expect, test } from "vitest";

import { getSessionAnswer } from "src/utils/getSessionAnswer";

const auth = {
  sessionClaims: { iss: "https://clerk.anchor.example" },
  sessionId: "sess_1",
  sessionStatus: "active",
  userId: "user_ada",
  orgId: undefined,
  actor: undefined,
};

test("an active session is signed in under the token's issuer, fingerprinting its organization, session and actor", () => {
  expect(getSessionAnswer(auth, { id: "user_ada" })).toEqual({
    status: "signed-in",
    principal: {
      authority: "https://clerk.anchor.example",
      subject: "user_ada",
      tenant: null,
    },
    user: { id: "user_ada" },
    context: '[null,"sess_1",null]',
    guest: false,
    impersonated: false,
  });
  expect(
    getSessionAnswer(
      { ...auth, orgId: "org_acme", actor: { sub: "user_admin" } },
      null,
    ),
  ).toMatchObject({
    context: '["org_acme","sess_1","user_admin"]',
    impersonated: true,
  });
});

test("a pending session is action-required with the pending status as its kind", () => {
  expect(
    getSessionAnswer({ ...auth, sessionStatus: "pending" }, null),
  ).toMatchObject({
    status: "action-required",
    action: { kind: "pending" },
    principal: { subject: "user_ada" },
  });
});
