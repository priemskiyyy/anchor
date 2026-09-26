import { expect, test } from "vitest";

import { getLoginKey } from "src/utils/getLoginKey";

test("one subject in two organizations is two logins", () => {
  expect(getLoginKey("auth0|ada", "org_acme")).not.toBe(
    getLoginKey("auth0|ada", "org_globex"),
  );
  expect(getLoginKey("auth0|ada", null)).toBe(getLoginKey("auth0|ada", null));
});
