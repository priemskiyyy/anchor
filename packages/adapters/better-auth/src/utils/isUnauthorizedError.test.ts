import { expect, test } from "vitest";

import { isUnauthorizedError } from "src/utils/isUnauthorizedError";

test("only an error with status 401 is unauthorized", () => {
  expect(isUnauthorizedError({ status: 401, statusText: "Unauthorized" })).toBe(
    true,
  );
  expect(isUnauthorizedError({ status: 500 })).toBe(false);
  expect(isUnauthorizedError({ statusText: "Unauthorized" })).toBe(false);
  expect(isUnauthorizedError(new TypeError("fetch failed"))).toBe(false);
  expect(isUnauthorizedError(null)).toBe(false);
  expect(isUnauthorizedError(401)).toBe(false);
});
