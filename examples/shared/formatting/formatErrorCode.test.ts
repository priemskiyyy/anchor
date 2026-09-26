import { AnchorError } from "@priemskiyyy/anchor";
import { expect, test } from "vitest";

import { formatErrorCode } from "example-shared/formatting/formatErrorCode";

test("an Anchor error reads as its code, and anything else never shows its message", () => {
  expect(
    formatErrorCode(
      new AnchorError({ code: "SESSION_CHANGED", message: "Replaced." }),
    ),
  ).toBe("SESSION_CHANGED");
  expect(formatErrorCode(new Error("secret provider detail"))).toBe(
    "an unexpected error",
  );
});
