import { expect, test } from "vitest";

import { getFetchAuthSessionError } from "src/utils/getFetchAuthSessionError";

test.each([
  "NotAuthorizedException",
  "TokenRevokedException",
  "UserNotFoundException",
  "PasswordResetRequiredException",
  "UserNotConfirmedException",
  "RefreshTokenReuseException",
])(
  "%s asks for the user with INTERACTION_REQUIRED and keeps Amplify's error as its cause",
  (name) => {
    const error = Object.assign(new Error(name), { name });

    expect(getFetchAuthSessionError(error)).toMatchObject({
      name: "AnchorError",
      code: "INTERACTION_REQUIRED",
      cause: error,
    });
  },
);

test("any other failure is kept as Amplify threw it", () => {
  const limited = Object.assign(new Error("Rate exceeded"), {
    name: "TooManyRequestsException",
  });

  const offline = new TypeError("fetch failed");

  expect(getFetchAuthSessionError(limited)).toBe(limited);
  expect(getFetchAuthSessionError(offline)).toBe(offline);
  expect(getFetchAuthSessionError({ name: "NotAuthorizedException" })).toEqual({
    name: "NotAuthorizedException",
  });
});
