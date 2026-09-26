import { expect, test } from "vitest";

import { AnchorError } from "src/utils/AnchorError";

test("an error carries its code, its message and the name consumers print", () => {
  const error = new AnchorError({
    code: "SESSION_CHANGED",
    message: "The session was replaced.",
  });

  expect(error).toBeInstanceOf(Error);
  expect(error.code).toBe("SESSION_CHANGED");
  expect(error.message).toBe("The session was replaced.");
  expect(error.name).toBe("AnchorError");
  expect(String(error)).toBe("AnchorError: The session was replaced.");
});

test("a cause is kept when given and absent when not", () => {
  const cause = new Error("network down");

  const failed = new AnchorError({
    code: "READ_FAILED",
    message: "The read failed.",
    cause,
  });

  const plain = new AnchorError({
    code: "NOT_STARTED",
    message: "Call start() first.",
  });

  expect(failed.cause).toBe(cause);
  expect(Object.hasOwn(plain, "cause")).toBe(false);
});
