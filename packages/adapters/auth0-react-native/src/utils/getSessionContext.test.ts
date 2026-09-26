import { expect, test } from "vitest";

import { getSessionContext } from "src/utils/getSessionContext";

test("the context is the organization of the login, or null without one", () => {
  expect(getSessionContext({ sub: "auth0|ada", org_id: "org_acme" })).toBe(
    "org_acme",
  );
  expect(getSessionContext({ sub: "auth0|ada" })).toBe(null);
});
