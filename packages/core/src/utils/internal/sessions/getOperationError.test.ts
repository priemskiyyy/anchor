import { expect, test } from "vitest";

import type { AnchorErrorCode } from "src/types/AnchorErrorCode";
import { AnchorError } from "src/utils/AnchorError";
import { getOperationError } from "src/utils/internal/sessions/getOperationError";

const ADAPTER_CODES: AnchorErrorCode[] = [
  "SESSION_CHANGED",
  "UNSUPPORTED",
  "INTERACTION_REQUIRED",
  "INVALID_CONFIGURATION",
];

test.each(ADAPTER_CODES)(
  "an adapter's %s keeps its code and is the very error the adapter threw",
  (code) => {
    const thrown = new AnchorError({ code, message: "From the adapter." });

    expect(getOperationError(thrown, "TOKEN_FAILED", "The token failed.")).toBe(
      thrown,
    );
  },
);

test("any other failure becomes the operation's code with what was thrown as its cause", () => {
  const network = new TypeError("fetch failed");

  const timeout = new AnchorError({
    code: "TIMEOUT",
    message: "An adapter's own timeout.",
  });

  expect(
    getOperationError(network, "TOKEN_FAILED", "The token failed."),
  ).toMatchObject({
    code: "TOKEN_FAILED",
    message: "The token failed.",
    cause: network,
  });
  expect(
    getOperationError(timeout, "END_FAILED", "The end failed."),
  ).toMatchObject({
    code: "END_FAILED",
    cause: timeout,
  });
  expect(
    getOperationError("offline", "READ_FAILED", "The read failed."),
  ).toMatchObject({
    code: "READ_FAILED",
    cause: "offline",
  });
});
