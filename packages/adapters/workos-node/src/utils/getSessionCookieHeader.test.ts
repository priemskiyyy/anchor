import { expect, test } from "vitest";

import { getSessionCookieHeader } from "src/utils/getSessionCookieHeader";

test("a sealed session is set in its cookie, and no session deletes it, with the attributes of WorkOS's session guide", () => {
  expect(getSessionCookieHeader("wos-session", "Fe26.2*1*sealed~2")).toBe(
    "wos-session=Fe26.2*1*sealed~2; Path=/; HttpOnly; Secure; SameSite=Lax",
  );
  expect(getSessionCookieHeader("session", null)).toBe(
    "session=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax",
  );
});
