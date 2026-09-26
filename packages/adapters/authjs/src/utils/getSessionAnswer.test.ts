import { expect, test } from "vitest";

import { getSessionAnswer } from "src/utils/getSessionAnswer";

test("no session is signed out", () => {
  expect(getSessionAnswer(null, () => "user")).toEqual({
    status: "signed-out",
  });
});

test("a session is signed in as the id its session callback added, and a mapper receives the whole session", () => {
  const session = {
    user: { id: "user_ada", name: "Ada" },
    expires: "2026-10-24T00:00:00.000Z",
    role: "admin",
  };

  expect(
    getSessionAnswer(session, (received) => ({
      same: received === session,
    })),
  ).toEqual({
    status: "signed-in",
    principal: { authority: "authjs", subject: "user_ada", tenant: null },
    user: { same: true },
    context: null,
    guest: false,
    impersonated: false,
  });
});

test("a session without an id answers an empty subject, never one guessed from the email", () => {
  expect(
    getSessionAnswer(
      { user: { name: "Ada", email: "ada@example.com" } },
      () => "user",
    ),
  ).toMatchObject({
    principal: { authority: "authjs", subject: "", tenant: null },
  });
});
