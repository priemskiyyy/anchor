import { expect, test } from "vitest";

import { sessionToken } from "src/sessionToken";

test("a profile mints the session token itself, or the JWT template it names, and is frozen", () => {
  expect(sessionToken()).toEqual({ kind: "session-token" });
  expect(sessionToken({ template: "supabase" })).toEqual({
    kind: "session-token",
    template: "supabase",
  });
  expect(Object.isFrozen(sessionToken())).toBe(true);
});
