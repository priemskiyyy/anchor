import { expect, test } from "vitest";

import { getFirebaseErrorCode } from "src/utils/getFirebaseErrorCode";

test("the code of a React Native Firebase error is read, even where the SDK defines it as a hidden property", () => {
  const hidden = new Error(
    "[auth/no-current-user] No user currently signed in.",
  );

  Object.defineProperty(hidden, "code", {
    enumerable: false,
    value: "auth/no-current-user",
  });

  expect(getFirebaseErrorCode(hidden)).toBe("auth/no-current-user");
  expect(getFirebaseErrorCode({ code: "auth/user-token-expired" })).toBe(
    "auth/user-token-expired",
  );
});

test("anything without a text code has none", () => {
  expect(getFirebaseErrorCode(new Error("boom"))).toBe(null);
  expect(getFirebaseErrorCode({ code: 42 })).toBe(null);
  expect(getFirebaseErrorCode(null)).toBe(null);
  expect(getFirebaseErrorCode("auth/no-current-user")).toBe(null);
});
