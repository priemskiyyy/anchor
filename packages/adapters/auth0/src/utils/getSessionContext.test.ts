import { expect, test } from "vitest";

import { getSessionContext } from "src/utils/getSessionContext";

test("the context fingerprints the organization and the Auth0 session, and is null without either", () => {
  expect(getSessionContext({ org_id: "org_acme", sid: "sid_1" })).toBe(
    '["org_acme","sid_1"]',
  );
  expect(getSessionContext({ sid: "sid_1" })).toBe('[null,"sid_1"]');
  expect(getSessionContext({ org_id: "org_acme" })).toBe('["org_acme",null]');
  expect(getSessionContext({ sub: "auth0|ada" })).toBe(null);
});
