import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";

type FakeSession = { id: string; user: User; ended: boolean };

type Route = (request: Request) => Response | Promise<Response>;

export const SUPABASE_URL = "https://anchor.supabase.co";

export const SUPABASE_ANON_KEY = "anchor-anon-key";

const API_VERSION = { "x-supabase-api-version": "2024-01-01" };

const answerError = (status: number, code: string, message: string) =>
  Response.json({ code, message }, { status, headers: API_VERSION });

const getBearerToken = (request: Request) =>
  request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";

// The cookie header a browser would send back after the response that set these cookies.
const getCookieHeader = (cookies: { name: string; value: string }[]) =>
  cookies
    .flatMap(({ name, value }) => (value === "" ? [] : [`${name}=${value}`]))
    .join("; ");

// Modelled on Supabase Auth's REST API under the 2024-01-01 version supabase-js 2.117.1 asks for: the password grant opens a session, the refresh grant rotates its refresh token and refuses a spent or ended one with refresh_token_not_found, /user answers the user of a live access token and refuses an ended session with session_not_found and an unknown token with bad_jwt, and /logout ends the session. Access tokens are opaque here, which the paths the adapter takes never decode.
export const createFakeSupabaseAuth = ({
  lifetime = 3600,
}: { lifetime?: number } = {}) => {
  const users = new Map<string, User>();
  const sessions = new Map<string, FakeSession>();
  const accessTokens = new Map<string, string>();
  const refreshTokens = new Map<string, string>();
  const requests: string[] = [];
  const failures = { user: false };

  let issued = 0;

  const issueTokens = (session: FakeSession) => {
    issued += 1;

    const accessToken = `access-${issued}`;
    const refreshToken = `refresh-${issued}`;

    accessTokens.set(accessToken, session.id);
    refreshTokens.set(refreshToken, session.id);

    return Response.json(
      {
        access_token: accessToken,
        token_type: "bearer",
        expires_in: lifetime,
        expires_at: Math.floor(Date.now() / 1000) + lifetime,
        refresh_token: refreshToken,
        user: session.user,
      },
      { headers: API_VERSION },
    );
  };

  const getLiveSession = (request: Request) =>
    sessions.get(accessTokens.get(getBearerToken(request)) ?? "");

  const routes: Record<string, Route> = {
    "POST /auth/v1/token?grant_type=password": async (request) => {
      const { email }: { email: string } = await request.json();
      const user = users.get(email);

      if (user === undefined) {
        return answerError(
          400,
          "invalid_credentials",
          "Invalid login credentials",
        );
      }

      const session = {
        id: `session-${sessions.size + 1}`,
        user,
        ended: false,
      };

      sessions.set(session.id, session);

      return issueTokens(session);
    },
    "POST /auth/v1/token?grant_type=refresh_token": async (request) => {
      const { refresh_token }: { refresh_token: string } = await request.json();
      const session = sessions.get(refreshTokens.get(refresh_token) ?? "");

      refreshTokens.delete(refresh_token);

      if (session === undefined || session.ended) {
        return answerError(
          400,
          "refresh_token_not_found",
          "Invalid Refresh Token: Refresh Token Not Found",
        );
      }

      return issueTokens(session);
    },
    "GET /auth/v1/user": (request) => {
      if (failures.user) {
        return Response.json(
          { message: "Service Unavailable" },
          { status: 503 },
        );
      }

      const session = getLiveSession(request);

      if (session === undefined) {
        return answerError(
          403,
          "bad_jwt",
          "invalid JWT: unable to parse or verify signature",
        );
      }

      if (session.ended) {
        return answerError(
          403,
          "session_not_found",
          "Session from session_id claim in JWT does not exist",
        );
      }

      return Response.json(session.user, { headers: API_VERSION });
    },
    "POST /auth/v1/logout?scope=local": (request) => {
      const session = getLiveSession(request);

      if (session !== undefined) {
        session.ended = true;
      }

      return new Response(null, { status: 204, headers: API_VERSION });
    },
  };

  const handleFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init);
    const url = new URL(request.url);
    const route = `${request.method} ${url.pathname}${url.search}`;
    const answer = routes[route];

    requests.push(route);

    if (answer === undefined) {
      return answerError(404, "not_found", `No route for ${route}`);
    }

    return answer(request);
  };

  const createClient = (cookies: {
    getAll: () => { name: string; value: string }[];
    setAll: (cookies: { name: string; value: string }[]) => void;
  }) =>
    createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies,
      global: { fetch: handleFetch },
    });

  // Registers a user a password grant can sign in, with the password every test uses.
  const createUser = (name: string, metadata: Record<string, string> = {}) => {
    const email = `${name}@example.com`;

    const user: User = {
      id: `00000000-0000-4000-8000-${String(users.size + 1).padStart(12, "0")}`,
      aud: "authenticated",
      role: "authenticated",
      email,
      phone: "",
      app_metadata: { provider: "email", providers: ["email"] },
      user_metadata: { name, ...metadata },
      identities: [],
      created_at: "2026-09-25T00:00:00Z",
      updated_at: "2026-09-25T00:00:00Z",
      is_anonymous: false,
    };

    users.set(email, user);

    return user;
  };

  return {
    fetch: handleFetch,
    requests,
    failures,
    createUser,
    // Signs a new user up and in through a real server client, and answers the cookie header its response set.
    signUp: async (name: string, metadata: Record<string, string> = {}) => {
      const email = `${name}@example.com`;
      const user = createUser(name, metadata);
      const set: { name: string; value: string }[] = [];

      const client = createClient({
        getAll: () => [],
        setAll: (cookies) => set.push(...cookies),
      });

      const { error } = await client.auth.signInWithPassword({
        email,
        password: "correct-horse-battery-staple",
      });

      if (error !== null) {
        throw error;
      }

      return { user, cookie: getCookieHeader(set) };
    },
    // Ends the session a cookie header carries through a real server client, as a sign-out elsewhere would.
    signOut: async (cookie: string) => {
      const client = createClient({
        getAll: () =>
          cookie.split("; ").map((pair) => {
            const separator = pair.indexOf("=");

            return {
              name: pair.slice(0, separator),
              value: pair.slice(separator + 1),
            };
          }),
        setAll: () => {},
      });

      const { error } = await client.auth.signOut({ scope: "local" });

      if (error === null) {
        return;
      }

      throw error;
    },
  };
};
