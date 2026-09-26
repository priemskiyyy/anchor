import { expect, test } from "vitest";

import { getSessionContext } from "src/utils/getSessionContext";

test("the context fingerprints the organization and the Keycloak session, and is null without either", () => {
  expect(
    getSessionContext({
      sub: "ada",
      sid: "sid_1",
      organization: { acme: { id: "org_1" } },
    }),
  ).toBe('[{"acme":{"id":"org_1"}},"sid_1"]');
  expect(getSessionContext({ organization: ["acme"] })).toBe('[["acme"],null]');
  expect(getSessionContext({ sid: "sid_1" })).toBe('[null,"sid_1"]');
  expect(getSessionContext({ sub: "ada" })).toBe(null);
});
