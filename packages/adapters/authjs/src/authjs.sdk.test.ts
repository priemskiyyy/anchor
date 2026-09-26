// @vitest-environment jsdom
import { Anchor } from "@priemskiyyy/anchor";
import type { AnchorSession, SessionState } from "@priemskiyyy/anchor";
import type { AuthOptions } from "next-auth";
import * as nextAuth from "next-auth/react";
import { TextDecoder, TextEncoder } from "node:util";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { authjs } from "src/authjs";

type ServerOptions = {
  /** Adds the user id to the client session, as the README's session callback does. */
  addsUserId?: boolean;
  /** The server fails every session request with a 500. */
  failsSessions?: boolean;
  /** The sign-out reaches the server without its CSRF cookie. */
  losesCsrfCookie?: boolean;
};

type ServerResponse = {
  status: (code: number) => ServerResponse;
  setHeader: (name: string, value: string | string[]) => ServerResponse;
  getHeader: (name: string) => string | string[] | undefined;
  json: (body: unknown) => ServerResponse;
  send: (body: unknown) => ServerResponse;
  end: () => ServerResponse;
};

// jose, which the next-auth server encrypts its session cookie with, checks for Node's Uint8Array, which Vitest's jsdom environment replaces with jsdom's.
beforeEach(() => {
  vi.stubGlobal(
    "Uint8Array",
    Object.getPrototypeOf(Buffer.prototype).constructor,
  );
  vi.stubGlobal("TextEncoder", TextEncoder);
  vi.stubGlobal("TextDecoder", TextDecoder);
});

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

const updateCookies = (cookies: Map<string, string>, header: unknown) => {
  for (const cookie of [header ?? []].flat()) {
    const [pair = "", ...attributes] = String(cookie).split(";");
    const separator = pair.indexOf("=");
    const name = pair.slice(0, separator);

    if (attributes.some((attribute) => /^\s*max-age=0$/i.test(attribute))) {
      cookies.delete(name);
    } else {
      cookies.set(name, pair.slice(separator + 1));
    }
  }
};

// The real next-auth server answers every request the real client makes, in-process, with the cookies a browser would keep.
const serveNextAuth = async ({
  addsUserId = true,
  failsSessions = false,
  losesCsrfCookie = false,
}: ServerOptions = {}) => {
  const { default: NextAuth } = await import("next-auth");

  const { default: Credentials } =
    await import("next-auth/providers/credentials");

  const cookies = new Map<string, string>();

  const options: AuthOptions = {
    secret: "anchor-authjs-sdk-test-secret-0123456789",
    session: { strategy: "jwt" },
    logger: { error: () => {}, warn: () => {}, debug: () => {} },
    providers: [
      Credentials({
        credentials: { username: {} },
        authorize: async (credentials) =>
          credentials?.username === undefined
            ? null
            : {
                id: `user_${credentials.username}`,
                name: credentials.username,
                email: `${credentials.username}@example.com`,
              },
      }),
    ],
    callbacks: {
      session: ({ session, token }) => {
        if (!addsUserId) {
          return session;
        }

        const user = { ...session.user, id: token.sub ?? "" };

        return { ...session, user };
      },
    },
  };

  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = new URL(String(input), location.origin);
    const action = url.pathname.replace(/^\/api\/auth\/?/, "");

    if (action === "session" && failsSessions) {
      return Response.json(
        { message: "Internal Server Error" },
        { status: 500 },
      );
    }

    const sent = new Map(cookies);

    if (action === "signout" && losesCsrfCookie) {
      sent.delete("next-auth.csrf-token");
    }

    const headers = new Map<string, string | string[]>();
    let status = 200;
    let body = "";

    const response: ServerResponse = {
      status: (code) => {
        status = code;

        return response;
      },
      setHeader: (name, value) => {
        headers.set(name.toLowerCase(), value);

        return response;
      },
      getHeader: (name) => headers.get(name.toLowerCase()),
      json: (value) => {
        body = JSON.stringify(value);

        return response;
      },
      send: (value) => {
        body = typeof value === "string" ? value : JSON.stringify(value);

        return response;
      },
      end: () => response,
    };

    const request = {
      method: (init?.method ?? "GET").toUpperCase(),
      query: {
        nextauth: action.split("/"),
        ...Object.fromEntries(url.searchParams),
      },
      body:
        init?.body === undefined
          ? undefined
          : Object.fromEntries(new URLSearchParams(String(init.body))),
      cookies: Object.fromEntries(
        [...sent].map(([name, value]) => [name, decodeURIComponent(value)]),
      ),
      headers: { host: location.host },
    };

    // @ts-expect-error NextAuth's pages handler is typed for Next's whole request and response, of which it reads only what is given here.
    await NextAuth(request, response, options);
    updateCookies(cookies, headers.get("set-cookie"));

    return new Response(body, {
      status,
      headers: { "content-type": "application/json" },
    });
  });

  return cookies;
};

const getSignedInSession = <TUser, TProfile extends string>(
  state: SessionState<TUser, TProfile>,
): AnchorSession<TUser, TProfile> => {
  if (state.status !== "signed-in") {
    throw new Error(`Expected a session, got ${state.status}.`);
  }

  return state.session;
};

test("the real next-auth client and server: no session is signed out, a sign-in is a session of the id the session callback adds, and ending signs it out without a redirect", async () => {
  const cookies = await serveNextAuth();
  const anchor = new Anchor({ adapter: authjs({ sdk: nextAuth }) });
  const page = location.href;

  await anchor.start();

  expect(anchor.native).toBe(nextAuth);
  expect(anchor.session.get()).toEqual({ status: "signed-out" });

  await expect(
    nextAuth.signIn("credentials", { username: "ada", redirect: false }),
  ).resolves.toMatchObject({ ok: true, error: null });
  await anchor.sync();

  const session = getSignedInSession(anchor.session.get());

  expect(session.principal).toEqual({
    authority: "authjs",
    subject: "user_ada",
    tenant: null,
  });
  expect(session.user).toEqual({
    id: "user_ada",
    name: "ada",
    email: "ada@example.com",
    image: null,
  });

  await expect(session.end()).resolves.toEqual({
    local: "completed",
    remote: "unknown",
    navigation: null,
  });
  expect(cookies.has("next-auth.session-token")).toBe(false);
  await expect(nextAuth.getSession({ broadcast: false })).resolves.toBe(null);
  expect(location.href).toBe(page);
  expect(anchor.session.get()).toEqual({ status: "signed-out" });

  anchor.dispose();
});

test("without the session callback the real client session has no user id, and the session is refused rather than guessed", async () => {
  await serveNextAuth({ addsUserId: false });
  await nextAuth.signIn("credentials", { username: "ada", redirect: false });

  const anchor = new Anchor({ adapter: authjs({ sdk: nextAuth }) });

  await anchor.start();

  expect(anchor.session.get()).toMatchObject({
    status: "unavailable",
    error: { code: "INVALID_ANSWER" },
  });

  anchor.dispose();
});

test("a sign-out in another tab reaches this one through the very broadcast the real client writes", async () => {
  await serveNextAuth();
  await nextAuth.signIn("credentials", { username: "ada", redirect: false });

  const anchor = new Anchor({ adapter: authjs({ sdk: nextAuth }) });

  await anchor.start();

  expect(getSignedInSession(anchor.session.get()).principal.subject).toBe(
    "user_ada",
  );

  const written = vi.spyOn(Storage.prototype, "setItem");

  await nextAuth.signOut({ redirect: false });

  const [key = null, newValue = null] = written.mock.calls[0] ?? [];

  expect(JSON.parse(String(newValue))).toMatchObject({
    event: "session",
    data: { trigger: "signout" },
  });

  window.dispatchEvent(new StorageEvent("storage", { key, newValue }));

  await expect
    .poll(() => anchor.session.get())
    .toEqual({ status: "signed-out" });

  anchor.dispose();
});

test("a sign-out the real server refused for its CSRF check rejects with END_FAILED, and the session stays", async () => {
  const cookies = await serveNextAuth({ losesCsrfCookie: true });

  await nextAuth.signIn("credentials", { username: "ada", redirect: false });

  const anchor = new Anchor({ adapter: authjs({ sdk: nextAuth }) });

  await anchor.start();

  const session = getSignedInSession(anchor.session.get());

  await expect(session.end()).rejects.toMatchObject({ code: "END_FAILED" });
  expect(cookies.has("next-auth.session-token")).toBe(true);
  expect(getSignedInSession(anchor.session.get()).key).toBe(session.key);

  anchor.dispose();
});

test("a session request the real server failed is unavailable, never signed out, though the real client's getSession() answers null for it", async () => {
  await serveNextAuth({ failsSessions: true });

  const anchor = new Anchor({ adapter: authjs({ sdk: nextAuth }) });

  await anchor.start();

  expect(anchor.session.get()).toMatchObject({
    status: "unavailable",
    error: { code: "READ_FAILED" },
  });
  await expect(nextAuth.getSession({ broadcast: false })).resolves.toBe(null);

  anchor.dispose();
});
