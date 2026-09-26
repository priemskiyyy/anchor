import { APIError } from "better-auth/api";
import { expect, test } from "vitest";

import { API_ERROR_HEADERS } from "src/utils/constants/betterAuth";
import { getApiErrorHeaders } from "src/utils/getApiErrorHeaders";

test("an APIError answers the headers its endpoint set before it threw", () => {
  const headers = new Headers([
    ["set-cookie", "better-auth.session_token=; Max-Age=0"],
  ]);

  const error = Object.defineProperty(
    new APIError("UNAUTHORIZED"),
    API_ERROR_HEADERS,
    { value: headers },
  );

  expect(getApiErrorHeaders(error)).toBe(headers);
});

test("an error without them, or a thrown value that is no object, answers none", () => {
  expect(getApiErrorHeaders(new APIError("UNAUTHORIZED"))).toBe(null);
  expect(getApiErrorHeaders(new Error("The database is unreachable."))).toBe(
    null,
  );
  expect(getApiErrorHeaders("refused")).toBe(null);
});
