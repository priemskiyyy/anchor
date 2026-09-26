import { expect, test } from "vitest";

import { getSessionContext } from "src/utils/getSessionContext";

test("the context fingerprints the organization, the provider session and the actor, and is null without any of them", () => {
  expect(
    getSessionContext({
      sub: "ada",
      sid: "sid_1",
      org_id: "org_acme",
      act: { sub: "support" },
    }),
  ).toBe('["org_acme",null,"sid_1",{"sub":"support"}]');
  expect(getSessionContext({ organization: ["acme"] })).toBe(
    '[null,["acme"],null,null]',
  );
  expect(getSessionContext({ sid: "sid_1" })).toBe('[null,null,"sid_1",null]');
  expect(getSessionContext({ sub: "ada", name: "Ada" })).toBe(null);
});
