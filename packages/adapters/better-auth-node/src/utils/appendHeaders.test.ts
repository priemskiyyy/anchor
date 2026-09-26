import { expect, test } from "vitest";

import { appendHeaders } from "src/utils/appendHeaders";

test("every cookie is kept and any other header takes the source's value", () => {
  const target = new Headers([
    ["set-cookie", "theme=dark; Path=/"],
    ["cache-control", "public"],
  ]);

  const source = new Headers([
    ["set-cookie", "better-auth.session_token=; Max-Age=0"],
    ["set-cookie", "better-auth.session_data=; Max-Age=0"],
    ["cache-control", "private, no-store"],
  ]);

  appendHeaders(target, source);

  expect(target.getSetCookie()).toEqual([
    "theme=dark; Path=/",
    "better-auth.session_token=; Max-Age=0",
    "better-auth.session_data=; Max-Age=0",
  ]);
  expect(target.get("cache-control")).toBe("private, no-store");
});

test("no source leaves the target as it was", () => {
  const target = new Headers([["set-cookie", "theme=dark; Path=/"]]);

  appendHeaders(target, null);

  expect([...target]).toEqual([["set-cookie", "theme=dark; Path=/"]]);
});
