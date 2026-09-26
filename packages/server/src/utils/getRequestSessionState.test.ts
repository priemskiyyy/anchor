import { AnchorError } from "@priemskiyyy/anchor";
import type { SessionState } from "@priemskiyyy/anchor";
import { expect, test } from "vitest";

import { getRequestSessionState } from "src/utils/getRequestSessionState";

test("a state still initializing was never read, so it is unavailable, never signed out", () => {
  expect(getRequestSessionState({ status: "initializing" })).toMatchObject({
    status: "unavailable",
    error: {
      code: "READ_FAILED",
      message: "The request's session was never read.",
    },
  });
});

test("a signed-out and an unavailable state are answered as they are", () => {
  const unavailable: SessionState<unknown, never> = {
    status: "unavailable",
    error: new AnchorError({ code: "TIMEOUT", message: "Too slow." }),
  };

  expect(getRequestSessionState({ status: "signed-out" })).toEqual({
    status: "signed-out",
  });
  expect(getRequestSessionState(unavailable)).toBe(unavailable);
});
