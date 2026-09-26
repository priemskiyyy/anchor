import { getRequestSession } from "@priemskiyyy/anchor-server";
import { AuthApiError, AuthRetryableFetchError } from "@supabase/supabase-js";
import { expect, test } from "vitest";

import {
  createFakeSupabaseServer,
  requestWithSessionCookie,
} from "src/fakeSupabaseServer.fixture";
import { supabase } from "src/supabase";

test("creating the adapter creates no server client and reads nothing", () => {
  const fake = createFakeSupabaseServer();
  const adapter = supabase({ sdk: fake.sdk });

  expect(fake.clients).toEqual([]);
  expect(adapter.native).toBe(fake.sdk);
  expect(adapter.name).toBe("supabase-node");
});

test("a request's session cookie reads as its Supabase user, mapped as the client adapter maps it", async () => {
  const fake = createFakeSupabaseServer();

  fake.signIn("token_ada", "user_ada");

  const { state, headers } = await getRequestSession(
    requestWithSessionCookie("token_ada"),
    { adapter: supabase({ sdk: fake.sdk }) },
  );

  expect(state).toEqual({
    status: "signed-in",
    session: {
      principal: { authority: "supabase", subject: "user_ada", tenant: null },
      user: {
        id: "user_ada",
        aud: "authenticated",
        role: "authenticated",
        email: "user_ada@example.com",
        is_anonymous: false,
        app_metadata: { provider: "email", providers: ["email"] },
        user_metadata: { name: "USER_ADA" },
        created_at: "2026-09-25T00:00:00Z",
      },
      guest: false,
      impersonated: false,
    },
  });
  expect([...headers]).toEqual([]);
});

test("each read creates its own server client over the cookies of its own request", async () => {
  const fake = createFakeSupabaseServer();
  const adapter = supabase({ sdk: fake.sdk });

  fake.signIn("token_ada", "user_ada");
  fake.signIn("token_grace", "user_grace");

  const [ada, grace] = await Promise.all([
    getRequestSession(requestWithSessionCookie("token_ada"), { adapter }),
    getRequestSession(requestWithSessionCookie("token_grace"), { adapter }),
  ]);

  expect(ada.state).toMatchObject({
    session: { principal: { subject: "user_ada" } },
  });
  expect(grace.state).toMatchObject({
    session: { principal: { subject: "user_grace" } },
  });
  expect(fake.clients.map((cookies) => cookies.getAll())).toEqual([
    [
      { name: "theme", value: "dark" },
      { name: "sb-anchor-auth-token", value: "token_ada" },
    ],
    [
      { name: "theme", value: "dark" },
      { name: "sb-anchor-auth-token", value: "token_grace" },
    ],
  ]);
});

test("an anonymous Supabase user is a guest", async () => {
  const fake = createFakeSupabaseServer();

  fake.signIn("token_guest", "user_guest", { anonymous: true });

  const { state } = await getRequestSession(
    requestWithSessionCookie("token_guest"),
    { adapter: supabase({ sdk: fake.sdk }) },
  );

  expect(state).toMatchObject({
    status: "signed-in",
    session: { principal: { subject: "user_guest" }, guest: true },
  });
});

test("a request without a session cookie is signed out, with nothing set on the response", async () => {
  const fake = createFakeSupabaseServer();

  const { state, headers } = await getRequestSession(
    requestWithSessionCookie(null),
    { adapter: supabase({ sdk: fake.sdk }) },
  );

  expect(state).toEqual({ status: "signed-out" });
  expect([...headers]).toEqual([]);
});

test("a session Supabase refreshes while reading sends its new cookie and Supabase's cache headers on the response", async () => {
  const fake = createFakeSupabaseServer();

  fake.signIn("token_ada", "user_ada", { expiring: true });

  const { state, headers } = await getRequestSession(
    requestWithSessionCookie("token_ada"),
    { adapter: supabase({ sdk: fake.sdk }) },
  );

  expect(state).toMatchObject({
    status: "signed-in",
    session: { principal: { subject: "user_ada" } },
  });
  expect(headers.getSetCookie()).toEqual([
    "sb-anchor-auth-token=token_ada.refreshed-1; Max-Age=34560000; Path=/; SameSite=Lax",
  ]);
  expect(headers.get("cache-control")).toBe(
    "private, no-cache, no-store, must-revalidate, max-age=0",
  );
  expect(headers.get("expires")).toBe("0");
  expect(headers.get("pragma")).toBe("no-cache");
});

test("a refresh that rotates the session's cookies followed by a getUser() that fails is unavailable, with the rotated cookies still on the response", async () => {
  const fake = createFakeSupabaseServer();
  const failure = new AuthRetryableFetchError("Service Unavailable", 503);

  fake.signIn("token_ada", "user_ada", { expiring: true });
  fake.failures.read = failure;

  const { state, headers } = await getRequestSession(
    requestWithSessionCookie("token_ada"),
    { adapter: supabase({ sdk: fake.sdk }) },
  );

  expect(state).toMatchObject({
    status: "unavailable",
    error: { code: "READ_FAILED", cause: failure },
  });
  expect(headers.getSetCookie()).toEqual([
    "sb-anchor-auth-token=token_ada.refreshed-1; Max-Age=34560000; Path=/; SameSite=Lax",
  ]);
  expect(headers.get("cache-control")).toBe(
    "private, no-cache, no-store, must-revalidate, max-age=0",
  );
});

test("a session Supabase Auth no longer holds is signed out, and the response deletes its cookie", async () => {
  const fake = createFakeSupabaseServer();

  fake.signIn("token_ada", "user_ada");
  fake.endSession("token_ada");

  const { state, headers } = await getRequestSession(
    requestWithSessionCookie("token_ada"),
    { adapter: supabase({ sdk: fake.sdk }) },
  );

  expect(state).toEqual({ status: "signed-out" });
  expect(headers.getSetCookie()).toEqual([
    "sb-anchor-auth-token=; Max-Age=0; Path=/; SameSite=Lax",
  ]);
});

test("Supabase Auth refusing the session's token, its user or its refresh token is signed out", async () => {
  const refusals = [
    new AuthApiError("invalid JWT", 403, "bad_jwt"),
    new AuthApiError(
      "User from sub claim in JWT does not exist",
      403,
      "user_not_found",
    ),
    new AuthApiError("User is banned", 400, "user_banned"),
    new AuthApiError(
      "Invalid Refresh Token: Refresh Token Not Found",
      400,
      "refresh_token_not_found",
    ),
    new AuthApiError(
      "Invalid Refresh Token: Already Used",
      400,
      "refresh_token_already_used",
    ),
    new AuthApiError(
      "Invalid Refresh Token: Session Expired",
      400,
      "session_expired",
    ),
  ];

  const states = await Promise.all(
    refusals.map(async (refusal) => {
      const fake = createFakeSupabaseServer();

      fake.signIn("token_ada", "user_ada");
      fake.failures.read = refusal;

      const { state } = await getRequestSession(
        requestWithSessionCookie("token_ada"),
        { adapter: supabase({ sdk: fake.sdk }) },
      );

      return state;
    }),
  );

  expect(states).toEqual(refusals.map(() => ({ status: "signed-out" })));
});

test("a failure that cannot tell the session is unavailable with the error as its cause, never signed out", async () => {
  const failures = [
    new AuthRetryableFetchError("fetch failed", 0),
    new AuthRetryableFetchError("Service Unavailable", 503),
    new AuthApiError(
      "Request rate limit reached",
      429,
      "over_request_rate_limit",
    ),
  ];

  const states = await Promise.all(
    failures.map(async (failure) => {
      const fake = createFakeSupabaseServer();

      fake.signIn("token_ada", "user_ada");
      fake.failures.read = failure;

      const { state } = await getRequestSession(
        requestWithSessionCookie("token_ada"),
        { adapter: supabase({ sdk: fake.sdk }) },
      );

      return state;
    }),
  );

  expect(states).toMatchObject(
    failures.map((failure) => ({
      status: "unavailable",
      error: { code: "READ_FAILED", cause: failure },
    })),
  );
});

test("a mapper receives the Supabase user, and its result is the session's user", async () => {
  const fake = createFakeSupabaseServer();

  fake.signIn("token_ada", "user_ada");

  const { state } = await getRequestSession(
    requestWithSessionCookie("token_ada"),
    {
      adapter: supabase({
        sdk: fake.sdk,
        user: (user) => ({ id: user.id, name: user.user_metadata.name }),
      }),
    },
  );

  expect(state).toMatchObject({
    session: { user: { id: "user_ada", name: "USER_ADA" } },
  });
});
