import { expect, test } from "vitest";

import { getSessionAnswer } from "src/utils/getSessionAnswer";

const AUTHORITY = "https://api.example.com";

test("no session, on the server's word, is signed out", () => {
  expect(getSessionAnswer(null, AUTHORITY)).toEqual({ status: "signed-out" });
});

test("a session is signed in as its subject under the backend's authority, with no tenant, context, guest or impersonation unless answered", () => {
  expect(
    getSessionAnswer({ subject: "user_42", user: { name: "Ada" } }, AUTHORITY),
  ).toEqual({
    status: "signed-in",
    principal: { authority: AUTHORITY, subject: "user_42", tenant: null },
    user: { name: "Ada" },
    context: null,
    guest: false,
    impersonated: false,
  });
  expect(
    getSessionAnswer(
      {
        subject: "user_42",
        user: null,
        tenant: "tenant_eu",
        context: "session_7",
        guest: true,
        impersonated: true,
        action: null,
      },
      AUTHORITY,
    ),
  ).toEqual({
    status: "signed-in",
    principal: {
      authority: AUTHORITY,
      subject: "user_42",
      tenant: "tenant_eu",
    },
    user: null,
    context: "session_7",
    guest: true,
    impersonated: true,
  });
});

test("a session with a step to finish requires that action", () => {
  expect(
    getSessionAnswer(
      { subject: "user_42", user: null, action: { kind: "accept-terms" } },
      AUTHORITY,
    ),
  ).toEqual({
    status: "action-required",
    action: { kind: "accept-terms" },
    principal: { authority: AUTHORITY, subject: "user_42", tenant: null },
    user: null,
    context: null,
    guest: false,
    impersonated: false,
  });
});
