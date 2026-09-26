import { expect, test } from "vitest";

import { accessToken } from "src/accessToken";

test("a profile keeps the audience and scope it is given, and leaves out the ones it is not", () => {
  const profile = accessToken({
    audience: "https://api.example.com",
    scope: "read:projects",
  });

  expect(profile).toEqual({
    kind: "access-token",
    audience: "https://api.example.com",
    scope: "read:projects",
  });
  expect(Object.isFrozen(profile)).toBe(true);
  expect(accessToken()).toEqual({ kind: "access-token" });
  expect(
    Object.keys(accessToken({ audience: "https://api.example.com" })),
  ).toEqual(["kind", "audience"]);
});
