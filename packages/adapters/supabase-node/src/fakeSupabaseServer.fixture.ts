import { AuthSessionMissingError } from "@supabase/supabase-js";

import type { SupabaseCookieMethods } from "src/types/SupabaseCookieMethods";
import type { SupabaseServerClientLike } from "src/types/SupabaseServerClientLike";

type FakeUser = {
  id: string;
  aud: string;
  role: string;
  email: string;
  is_anonymous: boolean;
  app_metadata: { provider: string; providers: string[] };
  user_metadata: { name: string };
  created_at: string;
};

type FakeSession = { user: FakeUser; expiring: boolean; ended: boolean };

export const AUTH_COOKIE = "sb-anchor-auth-token";

const CACHE_HEADERS = Object.freeze({
  "Cache-Control": "private, no-cache, no-store, must-revalidate, max-age=0",
  Expires: "0",
  Pragma: "no-cache",
});

const COOKIE_OPTIONS = Object.freeze({
  path: "/",
  sameSite: "lax",
  httpOnly: false,
  maxAge: 34_560_000,
});

const createUser = (id: string, anonymous: boolean): FakeUser => ({
  id,
  aud: "authenticated",
  role: "authenticated",
  email: anonymous ? "" : `${id}@example.com`,
  is_anonymous: anonymous,
  app_metadata: {
    provider: anonymous ? "anonymous" : "email",
    providers: anonymous ? [] : ["email"],
  },
  user_metadata: { name: id.toUpperCase() },
  created_at: "2026-09-25T00:00:00Z",
});

// Modelled on a @supabase/ssr 0.12.7 server client over supabase-js 2.117.1: auth.getUser() reads the session cookie through getAll(), answers AuthSessionMissingError without one, refreshes an expiring session and removes one Supabase Auth no longer holds through setAll() with the cache headers, and answers the error of a /user request that failed after any refresh.
export const createFakeSupabaseServer = () => {
  const sessions = new Map<string, FakeSession>();
  const clients: SupabaseCookieMethods[] = [];

  const failures: {
    read: { name: string; code?: string | undefined } | null;
  } = {
    read: null,
  };

  let refreshed = 0;

  const getUser = async (cookies: SupabaseCookieMethods) => {
    const token = cookies
      .getAll()
      .find(({ name }) => name === AUTH_COOKIE)?.value;

    if (token === undefined) {
      return { data: { user: null }, error: new AuthSessionMissingError() };
    }

    const session = sessions.get(token);

    if (session === undefined || session.ended) {
      cookies.setAll(
        [
          {
            name: AUTH_COOKIE,
            value: "",
            options: { ...COOKIE_OPTIONS, maxAge: 0 },
          },
        ],
        CACHE_HEADERS,
      );

      return { data: { user: null }, error: new AuthSessionMissingError() };
    }

    if (session.expiring) {
      refreshed += 1;

      const renewed = `${token}.refreshed-${refreshed}`;

      sessions.set(renewed, { ...session, expiring: false });
      sessions.set(token, { ...session, ended: true });
      cookies.setAll(
        [{ name: AUTH_COOKIE, value: renewed, options: COOKIE_OPTIONS }],
        CACHE_HEADERS,
      );
    }

    if (failures.read !== null) {
      return { data: { user: null }, error: failures.read };
    }

    return { data: { user: session.user }, error: null };
  };

  const sdk = (cookies: SupabaseCookieMethods) => {
    clients.push(cookies);

    return {
      auth: { getUser: () => getUser(cookies) },
    } satisfies SupabaseServerClientLike;
  };

  return {
    sdk,
    clients,
    failures,
    signIn: (
      token: string,
      id: string,
      {
        anonymous = false,
        expiring = false,
      }: { anonymous?: boolean; expiring?: boolean } = {},
    ) => {
      sessions.set(token, {
        user: createUser(id, anonymous),
        expiring,
        ended: false,
      });
    },
    endSession: (token: string) => {
      const session = sessions.get(token);

      if (session === undefined) {
        return;
      }

      sessions.set(token, { ...session, ended: true });
    },
  };
};

export const requestWithSessionCookie = (token: string | null) =>
  new Request("https://app.example.com/", {
    headers:
      token === null ? {} : { cookie: `theme=dark; ${AUTH_COOKIE}=${token}` },
  });
