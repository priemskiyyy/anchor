import { expect, test } from "vitest";

import { getSigninSilentError } from "src/utils/getSigninSilentError";

test.each([
  "login_required",
  "interaction_required",
  "account_selection_required",
  "consent_required",
  "invalid_grant",
])(
  "%s asks for the user with INTERACTION_REQUIRED and keeps the provider's error as its cause",
  (code) => {
    const error = Object.assign(new Error(code), {
      name: "ErrorResponse",
      error: code,
    });

    expect(getSigninSilentError(error)).toMatchObject({
      name: "AnchorError",
      code: "INTERACTION_REQUIRED",
      cause: error,
    });
  },
);

test("any other failure is kept as oidc-client-ts threw it", () => {
  const denied = Object.assign(new Error("access_denied"), {
    error: "access_denied",
  });

  const timeout = Object.assign(new Error("IFrame timed out"), {
    name: "ErrorTimeout",
  });

  expect(getSigninSilentError(denied)).toBe(denied);
  expect(getSigninSilentError(timeout)).toBe(timeout);
  expect(getSigninSilentError({ error: 42 })).toEqual({ error: 42 });
  expect(getSigninSilentError(null)).toBe(null);
});
