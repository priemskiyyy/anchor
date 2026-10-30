import { expect, test } from "vitest";

import { sessionToken } from "src/sessionToken";

test("a profile mints the session's own token, and is frozen", () => {
  expect(sessionToken()).toEqual({ kind: "session-token" });
  expect(Object.isFrozen(sessionToken())).toBe(true);
});
