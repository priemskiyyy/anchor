import { serializeCookieHeader } from "@supabase/ssr";
import { expect, test } from "vitest";

import type { SupabaseCookieOptions } from "src/types/SupabaseCookieOptions";
import { getSetCookieHeader } from "src/utils/getSetCookieHeader";

test("a cookie Supabase sets is the Set-Cookie header @supabase/ssr's serializeCookieHeader writes for it", () => {
  const cookies: [string, string, SupabaseCookieOptions][] = [
    [
      "sb-anchor-auth-token",
      "base64-eyJhY2Nlc3NfdG9rZW4iOiJ0b2tlbiJ9",
      { path: "/", sameSite: "lax", httpOnly: false, maxAge: 34_560_000 },
    ],
    [
      "sb-anchor-auth-token.1",
      "",
      { path: "/", sameSite: "lax", httpOnly: false, maxAge: 0 },
    ],
    [
      "sb-anchor-auth-token",
      "a value; with = specials",
      {
        domain: ".example.com",
        path: "/app",
        secure: true,
        httpOnly: true,
        partitioned: true,
        priority: "high",
        sameSite: "none",
      },
    ],
    [
      "session",
      "value",
      { expires: new Date(86_400_000), priority: "low", sameSite: true },
    ],
    [
      "session",
      "value",
      {
        priority: "medium",
        sameSite: "strict",
        encode: (value) => value.toUpperCase(),
      },
    ],
    ["session", "value", { sameSite: false, domain: "", path: "" }],
  ];

  for (const [name, value, options] of cookies) {
    expect(getSetCookieHeader(name, value, options)).toBe(
      serializeCookieHeader(name, value, options),
    );
  }

  expect(
    getSetCookieHeader("sb-anchor-auth-token", "", {
      path: "/",
      sameSite: "lax",
      maxAge: 0,
    }),
  ).toBe("sb-anchor-auth-token=; Max-Age=0; Path=/; SameSite=Lax");
});
