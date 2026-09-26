import { expect, test } from "vitest";

import { getUpdateTokenError } from "src/utils/getUpdateTokenError";

test("a refresh Keycloak refused with a 400 asks for the user with INTERACTION_REQUIRED and keeps keycloak-js's error as its cause", () => {
  const refused = Object.assign(
    new Error("Server responded with an invalid status."),
    { response: new Response(null, { status: 400 }) },
  );

  expect(getUpdateTokenError(refused)).toMatchObject({
    name: "AnchorError",
    code: "INTERACTION_REQUIRED",
    cause: refused,
  });
});

test("any other failure is kept as keycloak-js threw it", () => {
  const unavailable = Object.assign(
    new Error("Server responded with an invalid status."),
    { response: new Response(null, { status: 503 }) },
  );

  const offline = new TypeError("fetch failed");

  expect(getUpdateTokenError(unavailable)).toBe(unavailable);
  expect(getUpdateTokenError(offline)).toBe(offline);
  expect(getUpdateTokenError({ response: null })).toEqual({ response: null });
  expect(getUpdateTokenError(null)).toBe(null);
});
