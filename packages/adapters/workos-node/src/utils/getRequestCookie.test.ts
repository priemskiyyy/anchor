import { expect, test } from "vitest";

import { getRequestCookie } from "src/utils/getRequestCookie";

test("a cookie is the first of its name in the Cookie header, decoded, or null", () => {
  const headers = new Headers({
    cookie: "theme=dark; wos-session=Fe26.2*1*a%2Ab~2; wos-session=second",
  });

  expect(getRequestCookie(headers, "wos-session")).toBe("Fe26.2*1*a*b~2");
  expect(getRequestCookie(headers, "theme")).toBe("dark");
  expect(getRequestCookie(headers, "session")).toBeNull();
  expect(
    getRequestCookie(
      new Headers({ cookie: "wos-session=%E0%A4%A" }),
      "wos-session",
    ),
  ).toBe("%E0%A4%A");
  expect(getRequestCookie(new Headers(), "wos-session")).toBeNull();
});
