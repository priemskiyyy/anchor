import { getRequestSession } from "@priemskiyyy/anchor-server";
import { createServerClient } from "@supabase/ssr";
import { expect, test, vi } from "vitest";

import {
  createFakeSupabaseAuth,
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
} from "src/fakeSupabaseAuth.fixture";
import { supabase } from "src/supabase";

const createAdapter = (auth: ReturnType<typeof createFakeSupabaseAuth>) =>
  supabase({
    sdk: (cookies) =>
      createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        cookies,
        global: { fetch: auth.fetch },
      }),
  });

const requestWithCookie = (cookie: string) =>
  new Request("https://app.example.com/", { headers: { cookie } });

// A cookie's name and value, from a Cookie header pair or a Set-Cookie header.
const getCookiePair = (cookie: string): [string, string] => {
  const [pair = ""] = cookie.split(";");
  const separator = pair.indexOf("=");

  return [pair.slice(0, separator), pair.slice(separator + 1)];
};

// The cookie header a browser would send back after the response that set these cookies.
const getCookieHeader = (headers: Headers) =>
  headers
    .getSetCookie()
    .map((cookie) => cookie.split(";")[0])
    .join("; ");

test("the real @supabase/ssr server client: each request reads as the user its cookies carry, concurrently, each verified with Supabase Auth", async () => {
  const auth = createFakeSupabaseAuth();
  const adapter = createAdapter(auth);
  const ada = await auth.signUp("ada");
  const grace = await auth.signUp("grace");

  auth.requests.splice(0);

  const [adaRequest, graceRequest, anonymousRequest] = await Promise.all([
    getRequestSession(requestWithCookie(ada.cookie), { adapter }),
    getRequestSession(requestWithCookie(grace.cookie), { adapter }),
    getRequestSession(new Request("https://app.example.com/"), { adapter }),
  ]);

  expect(adaRequest.state).toEqual({
    status: "signed-in",
    session: {
      principal: { authority: "supabase", subject: ada.user.id, tenant: null },
      user: ada.user,
      guest: false,
      impersonated: false,
    },
  });
  expect(graceRequest.state).toMatchObject({
    status: "signed-in",
    session: { principal: { subject: grace.user.id }, user: grace.user },
  });
  expect(anonymousRequest.state).toEqual({ status: "signed-out" });
  expect(auth.requests).toEqual(["GET /auth/v1/user", "GET /auth/v1/user"]);
});

test("the real server client refreshes an expired session on the read, and the response carries the rotated session the next request reads with", async () => {
  const auth = createFakeSupabaseAuth({ lifetime: -60 });
  const adapter = createAdapter(auth);
  const ada = await auth.signUp("ada");

  auth.requests.splice(0);

  const refreshed = await getRequestSession(requestWithCookie(ada.cookie), {
    adapter,
  });

  expect(refreshed.state).toMatchObject({
    status: "signed-in",
    session: { principal: { subject: ada.user.id } },
  });
  expect(auth.requests).toEqual([
    "POST /auth/v1/token?grant_type=refresh_token",
    "GET /auth/v1/user",
  ]);
  expect(refreshed.headers.get("cache-control")).toBe(
    "private, no-cache, no-store, must-revalidate, max-age=0",
  );
  expect(
    refreshed.headers
      .getSetCookie()
      .map((cookie) => cookie.slice(cookie.indexOf(";"))),
  ).toEqual(["; Max-Age=34560000; Path=/; SameSite=Lax"]);

  const next = await getRequestSession(
    requestWithCookie(getCookieHeader(refreshed.headers)),
    { adapter },
  );

  expect(next.state).toMatchObject({
    status: "signed-in",
    session: { principal: { subject: ada.user.id } },
  });

  // supabase-js warns of the spent refresh token once for each of its two auth listeners.
  vi.spyOn(console, "warn").mockImplementation(() => {});

  const spent = await getRequestSession(requestWithCookie(ada.cookie), {
    adapter,
  });

  expect(spent.state).toEqual({ status: "signed-out" });
  expect(spent.headers.getSetCookie()).toEqual([
    "sb-anchor-auth-token=; Max-Age=0; Path=/; SameSite=Lax",
  ]);
});

test("the real server client reads a session too big for one cookie from its chunks, and a refresh rewrites only the chunk that changed", async () => {
  const auth = createFakeSupabaseAuth({ lifetime: -60 });
  const adapter = createAdapter(auth);
  const ada = await auth.signUp("ada", { biography: "Ada ".repeat(1_000) });
  const jar = new Map(ada.cookie.split("; ").map(getCookiePair));

  expect([...jar.keys()]).toEqual([
    "sb-anchor-auth-token.0",
    "sb-anchor-auth-token.1",
  ]);

  const refreshed = await getRequestSession(requestWithCookie(ada.cookie), {
    adapter,
  });

  expect(refreshed.state).toMatchObject({
    status: "signed-in",
    session: { principal: { subject: ada.user.id }, user: ada.user },
  });
  expect(
    refreshed.headers.getSetCookie().map((cookie) => getCookiePair(cookie)[0]),
  ).toEqual(["sb-anchor-auth-token.0"]);

  for (const cookie of refreshed.headers.getSetCookie()) {
    jar.set(...getCookiePair(cookie));
  }

  const next = await getRequestSession(
    requestWithCookie(
      [...jar].map(([name, value]) => `${name}=${value}`).join("; "),
    ),
    { adapter },
  );

  expect(next.state).toMatchObject({
    status: "signed-in",
    session: { principal: { subject: ada.user.id } },
  });
});

test("the real server client deletes every chunk of a session ended elsewhere on the response", async () => {
  const auth = createFakeSupabaseAuth();
  const ada = await auth.signUp("ada", { biography: "Ada ".repeat(1_000) });

  await auth.signOut(ada.cookie);

  const { state, headers } = await getRequestSession(
    requestWithCookie(ada.cookie),
    { adapter: createAdapter(auth) },
  );

  expect(state).toEqual({ status: "signed-out" });
  expect(headers.getSetCookie()).toEqual([
    "sb-anchor-auth-token.0=; Max-Age=0; Path=/; SameSite=Lax",
    "sb-anchor-auth-token.1=; Max-Age=0; Path=/; SameSite=Lax",
  ]);
});

test("the real server client reads a session ended elsewhere as signed out, and the response deletes its cookie", async () => {
  const auth = createFakeSupabaseAuth();
  const adapter = createAdapter(auth);
  const ada = await auth.signUp("ada");

  await auth.signOut(ada.cookie);
  auth.requests.splice(0);

  const { state, headers } = await getRequestSession(
    requestWithCookie(ada.cookie),
    { adapter },
  );

  expect(state).toEqual({ status: "signed-out" });
  expect(auth.requests).toEqual(["GET /auth/v1/user"]);
  expect(headers.getSetCookie()).toEqual([
    "sb-anchor-auth-token=; Max-Age=0; Path=/; SameSite=Lax",
  ]);
});

test("the real server client keeps the rotated cookies of a refresh on the response when Supabase Auth then fails the read", async () => {
  const auth = createFakeSupabaseAuth({ lifetime: -60 });
  const adapter = createAdapter(auth);
  const ada = await auth.signUp("ada");

  auth.failures.user = true;
  auth.requests.splice(0);

  const failed = await getRequestSession(requestWithCookie(ada.cookie), {
    adapter,
  });

  expect(failed.state).toMatchObject({
    status: "unavailable",
    error: {
      code: "READ_FAILED",
      cause: { name: "AuthRetryableFetchError", status: 503 },
    },
  });
  expect(auth.requests).toEqual([
    "POST /auth/v1/token?grant_type=refresh_token",
    "GET /auth/v1/user",
  ]);
  expect(failed.headers.get("cache-control")).toBe(
    "private, no-cache, no-store, must-revalidate, max-age=0",
  );

  auth.failures.user = false;

  const next = await getRequestSession(
    requestWithCookie(getCookieHeader(failed.headers)),
    { adapter },
  );

  expect(next.state).toMatchObject({
    status: "signed-in",
    session: { principal: { subject: ada.user.id } },
  });
});

test("the real server client makes a read Supabase Auth failed unavailable, never signed out", async () => {
  const auth = createFakeSupabaseAuth();
  const ada = await auth.signUp("ada");

  auth.failures.user = true;

  const { state, headers } = await getRequestSession(
    requestWithCookie(ada.cookie),
    { adapter: createAdapter(auth) },
  );

  expect(state).toMatchObject({
    status: "unavailable",
    error: {
      code: "READ_FAILED",
      cause: { name: "AuthRetryableFetchError", status: 503 },
    },
  });
  expect([...headers]).toEqual([]);
});
