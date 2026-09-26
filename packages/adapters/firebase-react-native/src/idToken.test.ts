import { expect, test } from "vitest";

import { idToken } from "src/idToken";

test("the profile mints the user's ID token, and is frozen", () => {
  expect(idToken()).toEqual({ kind: "id-token" });
  expect(Object.isFrozen(idToken())).toBe(true);
});
