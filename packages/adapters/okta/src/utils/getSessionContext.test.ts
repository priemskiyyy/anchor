import { expect, test } from "vitest";

import { getSessionContext } from "src/utils/getSessionContext";

test("the context is the Okta session of the ID token, or null without one", () => {
  expect(getSessionContext({ sub: "00u_ada", sid: "idx_1" })).toBe("idx_1");
  expect(getSessionContext({ sub: "00u_ada" })).toBe(null);
});
