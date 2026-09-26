import { expect, test } from "vitest";

import { getAcquireTokenError } from "src/utils/getAcquireTokenError";

test("InteractionRequiredAuthError asks for the user with INTERACTION_REQUIRED and keeps MSAL's error as its cause", () => {
  const error = Object.assign(new Error("interaction_required: AADSTS50076"), {
    name: "InteractionRequiredAuthError",
    errorCode: "interaction_required",
  });

  expect(getAcquireTokenError(error)).toMatchObject({
    name: "AnchorError",
    code: "INTERACTION_REQUIRED",
    cause: error,
  });
});

test("any other failure is kept as MSAL threw it", () => {
  const timeout = Object.assign(new Error("monitor_window_timeout"), {
    name: "BrowserAuthError",
    errorCode: "monitor_window_timeout",
  });

  const offline = new TypeError("fetch failed");

  expect(getAcquireTokenError(timeout)).toBe(timeout);
  expect(getAcquireTokenError(offline)).toBe(offline);
  expect(
    getAcquireTokenError({ name: "InteractionRequiredAuthError" }),
  ).toEqual({ name: "InteractionRequiredAuthError" });
});
