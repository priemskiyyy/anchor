import { APIError } from "better-auth/api";
import { expect, test } from "vitest";

import { isUnauthorizedApiError } from "src/utils/isUnauthorizedApiError";

test("only an API error with status code 401 is unauthorized", () => {
  expect(isUnauthorizedApiError(new APIError("UNAUTHORIZED"))).toBe(true);
  expect(isUnauthorizedApiError(new APIError("INTERNAL_SERVER_ERROR"))).toBe(
    false,
  );
  expect(isUnauthorizedApiError({ status: 401 })).toBe(false);
  expect(isUnauthorizedApiError(new Error("Unauthorized"))).toBe(false);
  expect(isUnauthorizedApiError(null)).toBe(false);
});
