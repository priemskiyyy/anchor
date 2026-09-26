import { getRequestSession } from "@priemskiyyy/anchor-server";
import { expect, test } from "vitest";

import { clerk } from "src/clerk";
import { createClerkServer, FRONTEND_API } from "src/fakeClerkApi.fixture";

const APP_URL = "https://app.anchor.example/dashboard";

const requestWith = (
  headers: Record<string, string>,
  { url = APP_URL, method = "GET" } = {},
) => new Request(url, { method, headers });

test("the real @clerk/backend client: each request's session token reads as its user from the Backend API, with its organization and actor, concurrently", async () => {
  const server = createClerkServer();
  const adapter = clerk({ sdk: server.sdk });

  const ada = server.signUp("ada", {
    o: { id: "org_acme", rol: "admin", slg: "acme" },
    act: { sub: "user_support" },
  });

  const grace = server.signUp("grace");

  const [adaRequest, graceRequest, anonymousRequest] = await Promise.all([
    getRequestSession(requestWith({ cookie: ada.cookie }), { adapter }),
    getRequestSession(requestWith({ authorization: `Bearer ${grace.token}` }), {
      adapter,
    }),
    getRequestSession(requestWith({}), { adapter }),
  ]);

  expect(adaRequest.state).toEqual({
    status: "signed-in",
    session: {
      principal: {
        authority: `https://${FRONTEND_API}`,
        subject: ada.userId,
        tenant: null,
      },
      user: {
        id: ada.userId,
        externalId: null,
        username: "ada",
        firstName: "ADA",
        lastName: "Lovelace",
        fullName: "ADA Lovelace",
        imageUrl: `https://img.clerk.com/${ada.userId}.png`,
        primaryEmailAddress: "ada@example.com",
        primaryPhoneNumber: null,
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
  expect(anonymousRequest.headers.get("x-clerk-auth-status")).toBe(
    "signed-out",
  );
  expect([...server.requests].sort()).toEqual([
    `https://api.clerk.com/v1/users/${ada.userId}`,
    `https://api.clerk.com/v1/users/${grace.userId}`,
  ]);
});

test("the real client's pending session is action-required, and its organization and actor reach the context", async () => {
  const server = createClerkServer();
  const adapter = clerk({ sdk: server.sdk });
  const pending = server.signUp("ada", { sts: "pending" });

  const member = server.signUp("grace", {
    o: { id: "org_acme", rol: "admin", slg: "acme" },
    act: { sub: "user_support" },
  });

  const [pendingAnswer, memberAnswer] = await Promise.all(
    [pending, member].map(({ cookie }) =>
      adapter.read({
        url: APP_URL,
        method: "GET",
        headers: new Headers({ cookie }),
        responseHeaders: new Headers(),
        signal: new AbortController().signal,
      }),
    ),
  );

  expect(pendingAnswer).toMatchObject({
    status: "action-required",
    action: { kind: "pending" },
    principal: { subject: pending.userId },
    context: `[null,"sess_${pending.userId}",null]`,
  });
  expect(memberAnswer).toMatchObject({
    status: "signed-in",
    context: `["org_acme","sess_${member.userId}","user_support"]`,
    impersonated: true,
  });
});

test("the real client refuses a forged session token, an expired one outside a page navigation and one for a party the options do not authorize, each signed out", async () => {
  const server = createClerkServer();
  const ada = server.signUp("ada");
  const expired = server.signUp("grace", {}, -120);
  const forged = `${ada.token.slice(0, ada.token.lastIndexOf("."))}.c2lnbmF0dXJl`;

  const states = await Promise.all(
    [
      {
        cookie: `__client_uat=1; __session=${forged}`,
        adapter: clerk({ sdk: server.sdk }),
      },
      { cookie: expired.cookie, adapter: clerk({ sdk: server.sdk }) },
      {
        cookie: ada.cookie,
        adapter: clerk({
          sdk: server.sdk,
          authorizedParties: ["https://elsewhere.example"],
        }),
      },
    ].map(
      async ({ cookie, adapter }) =>
        (await getRequestSession(requestWith({ cookie }), { adapter })).state,
    ),
  );

  expect(states).toEqual([
    { status: "signed-out" },
    { status: "signed-out" },
    { status: "signed-out" },
  ]);
});

test("the real client needs its handshake for a page navigation with an expired session token, which is unavailable with INTERACTION_REQUIRED and Clerk's redirect back to the page on the response", async () => {
  const server = createClerkServer();
  const expired = server.signUp("ada", {}, -120);

  const { state, headers } = await getRequestSession(
    requestWith({
      cookie: expired.cookie,
      accept: "text/html",
      "sec-fetch-dest": "document",
    }),
    { adapter: clerk({ sdk: server.sdk }) },
  );

  expect(state).toMatchObject({
    status: "unavailable",
    error: { code: "INTERACTION_REQUIRED" },
  });
  expect(headers.get("location")).toMatch(
    `https://${FRONTEND_API}/v1/client/handshake?redirect_url=${encodeURIComponent(APP_URL)}`,
  );
  expect(headers.get("cache-control")).toBe("no-store");
  expect(headers.getSetCookie()).toEqual([
    "__clerk_redirect_count=1; SameSite=Lax; HttpOnly; Max-Age=2",
  ]);
});

test("the real client sees the request's own method: a form post with an expired session token is signed out, since Clerk offers its handshake only to a GET", async () => {
  const server = createClerkServer();
  const expired = server.signUp("ada", {}, -120);

  const { state, headers } = await getRequestSession(
    requestWith(
      { cookie: expired.cookie, "sec-fetch-dest": "document" },
      { method: "POST" },
    ),
    { adapter: clerk({ sdk: server.sdk }) },
  );

  expect(state).toEqual({ status: "signed-out" });
  expect(headers.get("x-clerk-auth-reason")).toBe(
    "session-token-expired-refresh-non-eligible-non-get",
  );
});

test("the real client sees the request's Referer: a page navigation from another site to a signed-in page needs Clerk's cross-domain handshake, as Clerk's middleware does", async () => {
  const server = createClerkServer();
  const ada = server.signUp("ada");

  const [fromElsewhere, fromThisSite] = await Promise.all(
    ["https://elsewhere.example/", "https://app.anchor.example/"].map(
      (referer) =>
        getRequestSession(
          requestWith({
            cookie: ada.cookie,
            referer,
            "sec-fetch-dest": "document",
          }),
          { adapter: clerk({ sdk: server.sdk }) },
        ),
    ),
  );

  expect(fromElsewhere?.state).toMatchObject({
    status: "unavailable",
    error: { code: "INTERACTION_REQUIRED" },
  });
  expect(fromElsewhere?.headers.get("x-clerk-auth-reason")).toBe(
    "primary-domain-cross-origin-sync",
  );
  expect(fromThisSite?.state).toMatchObject({
    status: "signed-in",
    session: { principal: { subject: ada.userId } },
  });
});

test("the real client makes a read whose user the Backend API failed to answer unavailable, never signed out", async () => {
  const server = createClerkServer();
  const ada = server.signUp("ada");

  server.failures.api = true;

  const { state } = await getRequestSession(
    requestWith({ cookie: ada.cookie }),
    {
      adapter: clerk({ sdk: server.sdk }),
    },
  );

  expect(state).toMatchObject({
    status: "unavailable",
    error: { code: "READ_FAILED", cause: { status: 500 } },
  });
});
