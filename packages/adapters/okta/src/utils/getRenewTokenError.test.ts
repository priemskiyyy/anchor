import { expect, test } from "vitest";

import { getRenewTokenError } from "src/utils/getRenewTokenError";

test.each([
  "login_required",
  "interaction_required",
  "account_selection_required",
  "consent_required",
  "invalid_grant",
])(
  "%s asks for the user with INTERACTION_REQUIRED and keeps the Okta error as its cause",
  (code) => {
    const error = Object.assign(new Error(code), {
      name: "OAuthError",
      errorCode: code,
    });

    expect(getRenewTokenError(error)).toMatchObject({
      name: "AnchorError",
      code: "INTERACTION_REQUIRED",
      cause: error,
    });
  },
);

test("any other failure is kept as okta-auth-js threw it", () => {
  const apiError = Object.assign(new Error("Not found: Resource not found"), {
    name: "AuthApiError",
    errorCode: "E0000007",
  });

  const offline = new TypeError("fetch failed");

  expect(getRenewTokenError(apiError)).toBe(apiError);
  expect(getRenewTokenError(offline)).toBe(offline);
  expect(getRenewTokenError({ errorCode: 42 })).toEqual({ errorCode: 42 });
  expect(getRenewTokenError(null)).toBe(null);
});
