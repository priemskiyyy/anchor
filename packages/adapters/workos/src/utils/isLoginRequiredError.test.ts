import { expect, test } from "vitest";

import { isLoginRequiredError } from "src/utils/isLoginRequiredError";

test("only an error with authkit-js's login-required message says AuthKit holds no session", () => {
  expect(isLoginRequiredError(new Error("No access token available"))).toBe(
    true,
  );
  expect(
    isLoginRequiredError(
      Object.assign(new Error("Failed to refresh"), {
        name: "RefreshError",
        isTransient: true,
      }),
    ),
  ).toBe(false);
  expect(isLoginRequiredError(new TypeError("Failed to fetch"))).toBe(false);
  expect(isLoginRequiredError({ message: "No access token available" })).toBe(
    false,
  );
  expect(isLoginRequiredError(null)).toBe(false);
});
