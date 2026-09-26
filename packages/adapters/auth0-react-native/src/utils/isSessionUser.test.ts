import { expect, test } from "vitest";

import { isSessionUser } from "src/utils/isSessionUser";

const identity = (subject: string, context: string | null) => ({
  principal: {
    authority: "https://anchor-demo.us.auth0.com/",
    subject,
    tenant: null,
  },
  context,
});

test("the stored user is the session's when its subject and its organization both match", () => {
  const user = { sub: "auth0|ada", org_id: "org_acme" };

  expect(isSessionUser(user, identity("auth0|ada", "org_acme"))).toBe(true);
  expect(isSessionUser(user, identity("auth0|ada", "org_globex"))).toBe(false);
  expect(isSessionUser(user, identity("auth0|ada", null))).toBe(false);
  expect(isSessionUser(user, identity("auth0|grace", "org_acme"))).toBe(false);
  expect(isSessionUser(null, identity("auth0|ada", "org_acme"))).toBe(false);
});

test("a user without an organization matches a session without a context", () => {
  expect(isSessionUser({ sub: "auth0|ada" }, identity("auth0|ada", null))).toBe(
    true,
  );
});
