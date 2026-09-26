import { expect, test } from "vitest";

import { getAccessTokenError } from "src/utils/getAccessTokenError";

test("AuthKit's login-required error asks for the user with INTERACTION_REQUIRED and keeps it as its cause", () => {
  const error = new Error("No access token available");

  expect(getAccessTokenError(error)).toMatchObject({
    name: "AnchorError",
    code: "INTERACTION_REQUIRED",
    cause: error,
  });
});

test("any other failure is kept as authkit-js threw it", () => {
  const transient = Object.assign(new Error("Failed to refresh"), {
    name: "RefreshError",
    isTransient: true,
  });

  const network = new TypeError("Failed to fetch");

  expect(getAccessTokenError(transient)).toBe(transient);
  expect(getAccessTokenError(network)).toBe(network);
  expect(getAccessTokenError(null)).toBe(null);
});
