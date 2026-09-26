import { parseCookieHeader } from "@supabase/ssr";
import { expect, test } from "vitest";

import { getRequestCookies } from "src/utils/getRequestCookies";

test("a request's cookies are the ones @supabase/ssr's parseCookieHeader reads from its Cookie header", () => {
  const headers = [
    "sb-anchor-auth-token=base64-eyJhY2Nlc3NfdG9rZW4iOiJ0b2tlbiJ9",
    "sb-anchor-auth-token.0=base64-eyJh; sb-anchor-auth-token.1=Y2Nlc3MifQ",
    "theme = dark ;sb-anchor-auth-token=token",
    "theme=dark; theme=light",
    "name=%E2%9C%93; broken=%E0%A4%A",
    "pair=a=b; flag; =nameless",
  ];

  for (const header of headers) {
    const request = new Headers({ cookie: header });

    expect(getRequestCookies(request)).toEqual(
      parseCookieHeader(request.get("cookie") ?? ""),
    );
  }

  expect(getRequestCookies(new Headers())).toEqual([]);
  expect(getRequestCookies(new Headers({ cookie: headers[3] ?? "" }))).toEqual([
    { name: "theme", value: "dark" },
  ]);
});
