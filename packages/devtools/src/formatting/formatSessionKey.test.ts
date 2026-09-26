import { expect, test } from "vitest";

import { formatSessionKey } from "src/formatting/formatSessionKey";

test("a session key is shortened for a row, and absent when the row belongs to no session", () => {
  expect(
    formatSessionKey({ key: "5f0c1c9e-6b1e-4a53-9d0e-2f6a1d0c7b11" }),
  ).toBe("5f0c1c9e");
  expect(formatSessionKey({ key: "short" })).toBe("short");
  expect(formatSessionKey(null)).toBe("");
});
