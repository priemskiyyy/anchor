import { expect, test } from "vitest";

import { getRequestCookie } from "src/utils/getRequestCookie";

test("a cookie is the first of its name in the Cookie header, decoded, or null", () => {
  const headers = new Headers({
    cookie: "theme=dark; __session=eyJ%2Eabc; __session=second",
  });

  expect(getRequestCookie(headers, "__session")).toBe("eyJ.abc");
  expect(getRequestCookie(headers, "theme")).toBe("dark");
  expect(getRequestCookie(headers, "session")).toBeNull();
  expect(getRequestCookie(new Headers(), "__session")).toBeNull();
});

test("a value that is not valid URI encoding is answered as it came", () => {
  expect(
    getRequestCookie(
      new Headers({ cookie: "__session=%E0%A4%A" }),
      "__session",
    ),
  ).toBe("%E0%A4%A");
});
