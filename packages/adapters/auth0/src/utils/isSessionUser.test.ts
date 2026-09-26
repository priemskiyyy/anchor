import { expect, test } from "vitest";

import { isSessionUser } from "src/utils/isSessionUser";

const identity = (subject: string, context: string | null) => ({
  principal: {
    authority: "https://example.us.auth0.com/",
    subject,
    tenant: null,
  },
  context,
});

test("the cached ID token is the session's when its subject and its context both match", () => {
  const claims = { sub: "auth0|ada", sid: "sid_1", org_id: "org_acme" };

  expect(
    isSessionUser(claims, identity("auth0|ada", '["org_acme","sid_1"]')),
  ).toBe(true);
  expect(
    isSessionUser(claims, identity("auth0|ada", '["org_globex","sid_1"]')),
  ).toBe(false);
  expect(
    isSessionUser(claims, identity("auth0|grace", '["org_acme","sid_1"]')),
  ).toBe(false);
  expect(isSessionUser(undefined, identity("auth0|ada", null))).toBe(false);
});
