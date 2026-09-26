import { expect, test } from "vitest";

import { getCredentialsErrorType } from "src/utils/getCredentialsErrorType";

test("the normalized type of a credentials manager error is read, whatever native code it came with", () => {
  expect(
    getCredentialsErrorType(
      Object.assign(new Error("Unknown or invalid refresh token."), {
        code: "invalid_grant",
        type: "RENEW_FAILED",
      }),
    ),
  ).toBe("RENEW_FAILED");
});

test("anything without a text type has none", () => {
  expect(getCredentialsErrorType(new Error("boom"))).toBe(null);
  expect(getCredentialsErrorType({ type: 42 })).toBe(null);
  expect(getCredentialsErrorType(null)).toBe(null);
  expect(getCredentialsErrorType("RENEW_FAILED")).toBe(null);
});
