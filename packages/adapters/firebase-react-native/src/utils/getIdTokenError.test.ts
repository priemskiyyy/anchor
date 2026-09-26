import { expect, test } from "vitest";

import { getIdTokenError } from "src/utils/getIdTokenError";

test("an expired user credential becomes INTERACTION_REQUIRED with the Firebase error as its cause", () => {
  const expired = { code: "auth/user-token-expired" };

  expect(getIdTokenError(expired)).toMatchObject({
    name: "AnchorError",
    code: "INTERACTION_REQUIRED",
    cause: expired,
  });
});

test("a native SDK that holds no user becomes SESSION_CHANGED with the Firebase error as its cause", () => {
  const missing = { code: "auth/no-current-user" };

  expect(getIdTokenError(missing)).toMatchObject({
    name: "AnchorError",
    code: "SESSION_CHANGED",
    cause: missing,
  });
});

test("any other failure is kept as React Native Firebase threw it", () => {
  const offline = { code: "auth/network-request-failed" };
  const plain = new Error("boom");

  expect(getIdTokenError(offline)).toBe(offline);
  expect(getIdTokenError(plain)).toBe(plain);
  expect(getIdTokenError(null)).toBe(null);
});
