import { expect, test } from "vitest";

import { getAccessTokenError } from "src/utils/getAccessTokenError";

test.each([
  "login_required",
  "consent_required",
  "interaction_required",
  "mfa_required",
  "missing_refresh_token",
])(
  "%s asks for the user with INTERACTION_REQUIRED and keeps the Auth0 error as its cause",
  (code) => {
    const error = Object.assign(new Error(code), { error: code });

    expect(getAccessTokenError(error)).toMatchObject({
      name: "AnchorError",
      code: "INTERACTION_REQUIRED",
      cause: error,
    });
  },
);

test("any other failure is kept as auth0-spa-js threw it", () => {
  const timeout = Object.assign(new Error("Timeout"), { error: "timeout" });
  const plain = new TypeError("fetch failed");

  expect(getAccessTokenError(timeout)).toBe(timeout);
  expect(getAccessTokenError(plain)).toBe(plain);
  expect(getAccessTokenError({ error: 42 })).toEqual({ error: 42 });
});
