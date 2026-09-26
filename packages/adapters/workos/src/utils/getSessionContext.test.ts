import { expect, test } from "vitest";

import { getSessionContext } from "src/utils/getSessionContext";

test("the context fingerprints the organization and the impersonator of the latest refresh", () => {
  expect(
    getSessionContext({
      organizationId: "org_acme",
      impersonator: "support@example.com",
    }),
  ).toBe('["org_acme","support@example.com"]');
  expect(getSessionContext({ organizationId: null, impersonator: null })).toBe(
    "[null,null]",
  );
});
