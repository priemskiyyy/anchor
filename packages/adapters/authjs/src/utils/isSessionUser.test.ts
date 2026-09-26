import { expect, test } from "vitest";

import { isSessionUser } from "src/utils/isSessionUser";

const identity = (subject: string) => ({
  principal: { authority: "authjs", subject, tenant: null },
  context: null,
});

test("the server's session is the session's when it names the same user id", () => {
  const session = { user: { id: "user_ada", name: "Ada" } };

  expect(isSessionUser(session, identity("user_ada"))).toBe(true);
  expect(isSessionUser(session, identity("user_grace"))).toBe(false);
  expect(isSessionUser({ user: { name: "Ada" } }, identity("user_ada"))).toBe(
    false,
  );
  expect(isSessionUser(null, identity("user_ada"))).toBe(false);
});
