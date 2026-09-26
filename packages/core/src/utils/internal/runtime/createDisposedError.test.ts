import { expect, test } from "vitest";

import { AnchorError } from "src/utils/AnchorError";
import { createDisposedError } from "src/utils/internal/runtime/createDisposedError";

test("each call answers a fresh DISPOSED AnchorError", () => {
  const error = createDisposedError();

  expect(error).toBeInstanceOf(AnchorError);
  expect(error).toMatchObject({
    code: "DISPOSED",
    message: "The Anchor was disposed.",
  });
  expect(createDisposedError()).not.toBe(error);
});
