import { getRequestSession } from "@priemskiyyy/anchor-server";
import { betterAuth as createAuthServer } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";
import { expect, test } from "vitest";

import { betterAuth } from "src/betterAuth";

const createServer = () =>
  createAuthServer({
    baseURL: "http://localhost:3000",
    secret: "anchor-better-auth-server-test-secret-0123456789",
    database: memoryAdapter({ user: [], session: [], account: [] }),
    emailAndPassword: { enabled: true },
    logger: { disabled: true },
  });

// The cookie header a browser would send back after the response that set these cookies.
const getCookieHeader = (headers: Headers) =>
  headers
    .getSetCookie()
    .map((cookie) => cookie.split(";")[0])
    .join("; ");

const requestWithCookie = (cookie: string | null) =>
  new Request("http://localhost:3000/", {
    headers: cookie === null ? {} : { cookie },
  });

test("the real Better Auth server: each request reads as its own user, concurrently, and a signed-out session's cookie reads as signed out", async () => {
  const auth = createServer();
  const adapter = betterAuth({ sdk: auth });

  const ada = await auth.api.signUpEmail({
    body: {
      email: "ada@example.com",
      password: "correct-horse-battery-staple",
      name: "Ada",
    },
    returnHeaders: true,
  });

  const grace = await auth.api.signUpEmail({
    body: {
      email: "grace@example.com",
      password: "correct-horse-battery-staple",
      name: "Grace",
    },
    returnHeaders: true,
  });

  const adaCookie = getCookieHeader(ada.headers);
  const graceCookie = getCookieHeader(grace.headers);

  const [adaRequest, graceRequest, anonymousRequest] = await Promise.all([
    getRequestSession(requestWithCookie(adaCookie), { adapter }),
    getRequestSession(requestWithCookie(graceCookie), { adapter }),
    getRequestSession(requestWithCookie(null), { adapter }),
  ]);

  expect(adaRequest.state).toMatchObject({
    status: "signed-in",
    session: {
      principal: { authority: "better-auth", subject: ada.response.user.id },
      user: { name: "Ada", email: "ada@example.com" },
    },
  });
  expect(graceRequest.state).toMatchObject({
    status: "signed-in",
    session: {
      principal: { subject: grace.response.user.id },
      user: { name: "Grace" },
    },
  });
  expect(anonymousRequest.state).toEqual({ status: "signed-out" });

  await auth.api.signOut({ headers: new Headers({ cookie: adaCookie }) });

  const signedOut = await getRequestSession(requestWithCookie(adaCookie), {
    adapter,
  });

  expect(signedOut.state).toEqual({ status: "signed-out" });
});

test("the real Better Auth server: a session whose refresh fails is signed out, and the cookies Better Auth deleted reach the response", async () => {
  const auth = createAuthServer({
    baseURL: "http://localhost:3000",
    secret: "anchor-better-auth-server-test-secret-0123456789",
    database: memoryAdapter({ user: [], session: [], account: [] }),
    emailAndPassword: { enabled: true },
    logger: { disabled: true },
    // Every read refreshes, and the refresh is refused, as when the session is deleted between Better Auth's lookup and its update.
    session: { updateAge: 0 },
    databaseHooks: { session: { update: { before: async () => false } } },
  });

  const ada = await auth.api.signUpEmail({
    body: {
      email: "ada@example.com",
      password: "correct-horse-battery-staple",
      name: "Ada",
    },
    returnHeaders: true,
  });

  const { state, headers } = await getRequestSession(
    requestWithCookie(getCookieHeader(ada.headers)),
    { adapter: betterAuth({ sdk: auth }) },
  );

  expect(state).toEqual({ status: "signed-out" });
  expect(headers.getSetCookie()).toEqual([
    "better-auth.session_token=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax",
    "better-auth.session_data=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax",
    "better-auth.dont_remember=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax",
  ]);
});
