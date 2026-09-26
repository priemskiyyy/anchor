import { APIError } from "better-auth/api";

import type { BetterAuthServerLike } from "src/types/BetterAuthServerLike";

type FakeSession = {
  user: {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    image: null;
    createdAt: Date;
    updatedAt: Date;
  };
  session: { id: string; token: string; userId: string; expiresAt: Date };
};

const getSessionToken = (headers: Headers) =>
  /(?:^|;\s*)better-auth\.session_token=([^;]+)/.exec(
    headers.get("cookie") ?? "",
  )?.[1] ?? null;

// Modelled on better-auth 1.7.6's auth.api.getSession({ headers, returnHeaders: true }): it answers the session of the request's session cookie, or null, with the headers to set, and when the refresh of a session fails it deletes the session cookies and throws an APIError with statusCode 401 that carries those deletions under better-call's error-headers symbol.
export const createFakeBetterAuthServer = () => {
  const sessions = new Map<string, FakeSession>();

  const failures: { read: unknown; refresh: boolean } = {
    read: null,
    refresh: false,
  };

  const sdk = {
    api: {
      getSession: async ({
        headers,
      }: {
        headers: Headers;
        returnHeaders: true;
      }) => {
        if (failures.read !== null) {
          throw failures.read;
        }

        const token = getSessionToken(headers);
        const response = token === null ? null : (sessions.get(token) ?? null);

        if (response !== null && failures.refresh) {
          throw Object.defineProperty(
            new APIError("UNAUTHORIZED", { message: "Failed to get session" }),
            Symbol.for("better-call:api-error-headers"),
            {
              value: new Headers([
                [
                  "set-cookie",
                  "better-auth.session_token=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax",
                ],
                [
                  "set-cookie",
                  "better-auth.session_data=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax",
                ],
                [
                  "set-cookie",
                  "better-auth.dont_remember=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax",
                ],
              ]),
            },
          );
        }

        return {
          headers: new Headers(
            response === null
              ? {}
              : {
                  "set-cookie": `better-auth.session_data=${token}; Path=/; HttpOnly; SameSite=Lax`,
                },
          ),
          response,
        };
      },
    },
  } satisfies BetterAuthServerLike;

  return {
    sdk,
    failures,
    signIn: (token: string, id: string) => {
      sessions.set(token, {
        user: {
          id,
          name: id.toUpperCase(),
          email: `${id}@example.com`,
          emailVerified: true,
          image: null,
          createdAt: new Date(0),
          updatedAt: new Date(0),
        },
        session: {
          id: `session_${sessions.size + 1}`,
          token,
          userId: id,
          expiresAt: new Date(86_400_000),
        },
      });
    },
  };
};

export const requestWithSessionToken = (token: string | null) =>
  new Request("http://localhost:3000/", {
    headers:
      token === null ? {} : { cookie: `better-auth.session_token=${token}` },
  });
