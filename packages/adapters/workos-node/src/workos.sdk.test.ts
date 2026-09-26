import { getRequestSession } from "@priemskiyyy/anchor-server";
import { expect, test } from "vitest";

import { COOKIE_PASSWORD, createWorkosServer } from "src/fakeWorkosApi.fixture";
import { workos } from "src/workos";

const requestWithCookie = (cookie: string) =>
  new Request("https://app.example.com/", { headers: { cookie } });

// The cookie header a browser would send back after the response that set these cookies.
const getCookieHeader = (headers: Headers) =>
  headers
    .getSetCookie()
    .map((cookie) => cookie.split(";")[0])
    .join("; ");

test("the real @workos-inc/node client: each request's sealed session reads as its user, with its organization and impersonator, concurrently", async () => {
  const server = createWorkosServer();
  const adapter = workos({ sdk: server.sdk, cookiePassword: COOKIE_PASSWORD });

  const ada = await server.signUp("ada", {
    organizationId: "org_acme",
    impersonator: { email: "support@example.com", reason: "Ticket 42" },
  });

  const grace = await server.signUp("grace");

  const [adaRequest, graceRequest, anonymousRequest] = await Promise.all([
    getRequestSession(requestWithCookie(ada.cookie), { adapter }),
    getRequestSession(requestWithCookie(grace.cookie), { adapter }),
    getRequestSession(new Request("https://app.example.com/"), { adapter }),
  ]);

  expect(adaRequest.state).toEqual({
    status: "signed-in",
    session: {
      principal: { authority: "workos", subject: ada.userId, tenant: null },
      user: {
        id: ada.userId,
        email: "ada@example.com",
        emailVerified: true,
        firstName: "ADA",
        lastName: "Lovelace",
        profilePictureUrl: null,
        externalId: null,
      },
      guest: false,
      impersonated: true,
    },
  });
  expect(graceRequest.state).toMatchObject({
    status: "signed-in",
    session: { principal: { subject: grace.userId }, impersonated: false },
  });
  expect(anonymousRequest.state).toEqual({ status: "signed-out" });
  expect(server.grants).toEqual(["password", "password"]);
});

test("the real client refreshes an expired session through WorkOS, the response sets the newly sealed session, and the next request reads it without a refresh", async () => {
  const server = createWorkosServer();
  const adapter = workos({ sdk: server.sdk, cookiePassword: COOKIE_PASSWORD });

  const ada = await server.signUp("ada", {
    organizationId: "org_acme",
    lifetime: -60,
  });

  const refreshed = await getRequestSession(requestWithCookie(ada.cookie), {
    adapter,
  });

  const sealed = getCookieHeader(refreshed.headers);

  expect(refreshed.state).toMatchObject({
    status: "signed-in",
    session: { principal: { subject: ada.userId } },
  });
  expect(server.grants).toEqual(["password", "refresh_token"]);
  expect(sealed.startsWith("wos-session=Fe26.2*")).toBe(true);
  expect(
    refreshed.headers
      .getSetCookie()
      .map((cookie) => cookie.slice(cookie.indexOf(";"))),
  ).toEqual(["; Path=/; HttpOnly; Secure; SameSite=Lax"]);

  const next = await getRequestSession(requestWithCookie(sealed), { adapter });

  expect(next.state).toEqual(refreshed.state);
  expect([...next.headers]).toEqual([]);
  expect(server.grants).toEqual(["password", "refresh_token"]);
});

test("the real client keeps the newly sealed session of a refresh on the response when a later step of the read fails", async () => {
  const server = createWorkosServer();
  const ada = await server.signUp("ada", { lifetime: -60 });

  const failed = await getRequestSession(requestWithCookie(ada.cookie), {
    adapter: workos({
      sdk: server.sdk,
      cookiePassword: COOKIE_PASSWORD,
      user: () => {
        throw new Error("The user store is down.");
      },
    }),
  });

  expect(failed.state).toMatchObject({
    status: "unavailable",
    error: { code: "READ_FAILED" },
  });
  expect(server.grants).toEqual(["password", "refresh_token"]);

  const next = await getRequestSession(
    requestWithCookie(getCookieHeader(failed.headers)),
    { adapter: workos({ sdk: server.sdk, cookiePassword: COOKIE_PASSWORD }) },
  );

  expect(next.state).toMatchObject({
    status: "signed-in",
    session: { principal: { subject: ada.userId } },
  });
  expect(server.grants).toEqual(["password", "refresh_token"]);
});

test("the real client reads a sealed session it cannot open with the password as signed out, and one whose refresh WorkOS refuses deletes its cookie", async () => {
  const server = createWorkosServer();
  const ada = await server.signUp("ada");
  const grace = await server.signUp("grace", { lifetime: -60 });

  server.end(grace.userId);

  const [wrongPassword, ended] = await Promise.all([
    getRequestSession(requestWithCookie(ada.cookie), {
      adapter: workos({
        sdk: server.sdk,
        cookiePassword: "another-cookie-password-0123456789abcdef",
      }),
    }),
    getRequestSession(requestWithCookie(grace.cookie), {
      adapter: workos({ sdk: server.sdk, cookiePassword: COOKIE_PASSWORD }),
    }),
  ]);

  expect(wrongPassword.state).toEqual({ status: "signed-out" });
  expect([...wrongPassword.headers]).toEqual([]);
  expect(ended.state).toEqual({ status: "signed-out" });
  expect(ended.headers.getSetCookie()).toEqual([
    "wos-session=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax",
  ]);
});

test("the real client makes a refresh the network failed unavailable, never signed out", async () => {
  const server = createWorkosServer();
  const ada = await server.signUp("ada", { lifetime: -60 });

  server.failures.authenticate = true;

  const { state } = await getRequestSession(requestWithCookie(ada.cookie), {
    adapter: workos({ sdk: server.sdk, cookiePassword: COOKIE_PASSWORD }),
  });

  expect(state).toMatchObject({
    status: "unavailable",
    error: {
      code: "READ_FAILED",
      cause: { cause: new TypeError("fetch failed") },
    },
  });
});

test("the real client makes a read whose key set the network could not fetch unavailable, never signed out", async () => {
  const server = createWorkosServer();
  const ada = await server.signUp("ada");

  server.failures.jwks = true;

  const { state } = await getRequestSession(requestWithCookie(ada.cookie), {
    adapter: workos({ sdk: server.sdk, cookiePassword: COOKIE_PASSWORD }),
  });

  expect(state).toMatchObject({
    status: "unavailable",
    error: { code: "READ_FAILED", cause: new TypeError("fetch failed") },
  });
});
