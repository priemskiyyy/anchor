import { expect, test } from "vitest";

import { getSessionContext } from "src/utils/getSessionContext";

test("the context is the refresh token's origin_jti, and null without one", () => {
  expect(getSessionContext({ sub: "ada", origin_jti: "origin_1" })).toBe(
    "origin_1",
  );
  expect(getSessionContext({ sub: "ada" })).toBe(null);
});

test("an origin_jti that is not a string is no context", () => {
  expect(getSessionContext({ sub: "ada", origin_jti: 42 })).toBe(null);
});
