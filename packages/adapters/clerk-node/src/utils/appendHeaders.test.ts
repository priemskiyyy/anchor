import { expect, test } from "vitest";

import { appendHeaders } from "src/utils/appendHeaders";

test("every cookie is kept and any other header takes the source's value", () => {
  const target = new Headers([
    ["set-cookie", "theme=dark; Path=/"],
    ["cache-control", "public"],
  ]);

  const source = new Headers([
    ["set-cookie", "__clerk_redirect_count=1; Max-Age=2"],
    ["set-cookie", "__session=; Max-Age=0"],
    ["cache-control", "no-store"],
    ["location", "https://clerk.anchor.example/v1/client/handshake"],
  ]);

  appendHeaders(target, source);

  expect(target.getSetCookie()).toEqual([
    "theme=dark; Path=/",
    "__clerk_redirect_count=1; Max-Age=2",
    "__session=; Max-Age=0",
  ]);
  expect(target.get("cache-control")).toBe("no-store");
  expect(target.get("location")).toBe(
    "https://clerk.anchor.example/v1/client/handshake",
  );
});
