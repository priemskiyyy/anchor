import { expect, test } from "vitest";

import { accessToken } from "src/accessToken";

test("a profile keeps a frozen copy of its scopes, so a later change to the array given changes nothing", () => {
  const scopes = ["User.Read", "Mail.Read"];
  const profile = accessToken({ scopes });

  scopes.push("Files.Read");

  expect(profile).toEqual({
    kind: "access-token",
    scopes: ["User.Read", "Mail.Read"],
  });
  expect(Object.isFrozen(profile)).toBe(true);
  expect(Object.isFrozen(profile.scopes)).toBe(true);
});
