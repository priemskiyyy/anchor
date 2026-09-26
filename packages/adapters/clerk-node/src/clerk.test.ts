import { getRequestSession } from "@priemskiyyy/anchor-server";
import { expect, test } from "vitest";

import { clerk } from "src/clerk";
import {
  createFakeClerkBackend,
  requestWith,
} from "src/fakeClerkBackend.fixture";

test("creating the adapter reads and calls nothing on the Clerk client", () => {
  const fake = createFakeClerkBackend();
  const touched: PropertyKey[] = [];

  const sdk = new Proxy(fake.sdk, {
    get: (target, key, receiver) => {
      touched.push(key);

      return Reflect.get(target, key, receiver);
    },
  });

  const adapter = clerk({
    sdk,
    authorizedParties: ["https://app.anchor.example"],
  });

  expect(touched).toEqual([]);
  expect(adapter.native).toBe(sdk);
  expect(adapter.name).toBe("clerk-node");
});

test("a request's session token reads as its Clerk user, with its organization and actor in the context, mapped as the client adapter maps it", async () => {
  const fake = createFakeClerkBackend();

  fake.signIn("token_ada", "user_ada", {
    orgId: "org_acme",
    actor: { sub: "user_admin" },
  });

  const { state, headers } = await getRequestSession(
    requestWith({ cookie: "__client_uat=1790000000; __session=token_ada" }),
    { adapter: clerk({ sdk: fake.sdk }) },
  );

  expect(state).toEqual({
    status: "signed-in",
    session: {
      principal: {
        authority: "https://clerk.anchor.example",
        subject: "user_ada",
        tenant: null,
      },
      user: {
        id: "user_ada",
        externalId: null,
        username: "user_ada",
        firstName: "USER_ADA",
        lastName: "Lovelace",
        fullName: "USER_ADA Lovelace",
        imageUrl: "https://img.clerk.com/user_ada.png",
        primaryEmailAddress: "user_ada@example.com",
        primaryPhoneNumber: null,
      },
      guest: false,
      impersonated: true,
    },
  });
  expect([...headers]).toEqual([]);
});

test("the session context fingerprints the organization, the Clerk session and the actor, as the client adapter's does", async () => {
  const fake = createFakeClerkBackend();
  const adapter = clerk({ sdk: fake.sdk });

  fake.signIn("token_ada", "user_ada");
  fake.signIn("token_grace", "user_grace", {
    orgId: "org_acme",
    actor: { sub: "user_admin" },
  });

  const [ada, grace] = await Promise.all(
    ["token_ada", "token_grace"].map((token) =>
      adapter.read({
        url: "https://app.anchor.example/",
        method: "GET",
        headers: new Headers({ authorization: `Bearer ${token}` }),
        responseHeaders: new Headers(),
        signal: new AbortController().signal,
      }),
    ),
  );

  expect(ada).toMatchObject({
    context: '[null,"sess_user_ada",null]',
    impersonated: false,
  });
  expect(grace).toMatchObject({
    context: '["org_acme","sess_user_grace","user_admin"]',
    impersonated: true,
  });
});

test("a pending session is action-required, read from Clerk with treatPendingAsSignedOut false", async () => {
  const fake = createFakeClerkBackend();

  fake.signIn("token_ada", "user_ada", { status: "pending" });

  const { state } = await getRequestSession(
    requestWith({ cookie: "__session=token_ada" }),
    { adapter: clerk({ sdk: fake.sdk }) },
  );

  expect(state).toMatchObject({
    status: "action-required",
    action: { kind: "pending" },
    session: { principal: { subject: "user_ada" } },
  });
  expect(fake.toAuthOptions).toEqual([{ treatPendingAsSignedOut: false }]);
});

test("Clerk authenticates the request itself, its URL, method and headers, with the authorized parties the options name", async () => {
  const fake = createFakeClerkBackend();

  fake.signIn("token_ada", "user_ada");

  await getRequestSession(
    requestWith(
      {
        cookie: "__session=token_ada",
        referer: "https://app.anchor.example/settings",
        "sec-fetch-dest": "document",
      },
      { url: "https://app.anchor.example/billing?plan=team", method: "POST" },
    ),
    {
      adapter: clerk({
        sdk: fake.sdk,
        authorizedParties: ["https://app.anchor.example"],
      }),
    },
  );

  expect(fake.requests).toEqual([
    {
      url: "https://app.anchor.example/billing?plan=team",
      method: "POST",
      headers: [
        ["cookie", "__session=token_ada"],
        ["referer", "https://app.anchor.example/settings"],
        ["sec-fetch-dest", "document"],
      ],
      options: { authorizedParties: ["https://app.anchor.example"] },
    },
  ]);
});

test("the headers Clerk answers, such as a refreshed session cookie, reach the response", async () => {
  const fake = createFakeClerkBackend();

  fake.signIn("token_ada", "user_ada", {
    refreshedCookie:
      "__session=token_ada_refreshed; Path=/; Secure; SameSite=Lax",
  });

  const { headers } = await getRequestSession(
    requestWith({ cookie: "__session=token_ada" }),
    { adapter: clerk({ sdk: fake.sdk }) },
  );

  expect(headers.getSetCookie()).toEqual([
    "__session=token_ada_refreshed; Path=/; Secure; SameSite=Lax",
  ]);
});

test("a request without a session token, with one Clerk refuses, or with an expired one outside a page navigation, is signed out", async () => {
  const fake = createFakeClerkBackend();

  fake.signIn("token_ada", "user_ada");
  fake.signIn("token_grace", "user_grace");
  fake.expire("token_grace");

  const states = await Promise.all(
    [
      { adapter: clerk({ sdk: fake.sdk }), headers: {} },
      {
        adapter: clerk({ sdk: fake.sdk }),
        headers: { cookie: "__session=forged" },
      },
      {
        adapter: clerk({ sdk: fake.sdk }),
        headers: { authorization: "Bearer token_grace" },
      },
      {
        adapter: clerk({
          sdk: fake.sdk,
          authorizedParties: ["https://elsewhere.example"],
        }),
        headers: { cookie: "__session=token_ada" },
      },
    ].map(
      async ({ adapter, headers }) =>
        (await getRequestSession(requestWith(headers), { adapter })).state,
    ),
  );

  expect(states).toEqual([
    { status: "signed-out" },
    { status: "signed-out" },
    { status: "signed-out" },
    { status: "signed-out" },
  ]);
});

test("the headers Clerk answers for a signed-out request, its auth status and reason, reach the response", async () => {
  const fake = createFakeClerkBackend();

  const { state, headers } = await getRequestSession(requestWith({}), {
    adapter: clerk({ sdk: fake.sdk }),
  });

  expect(state).toEqual({ status: "signed-out" });
  expect([...headers]).toEqual([
    ["x-clerk-auth-reason", "session-token-and-uat-missing"],
    ["x-clerk-auth-status", "signed-out"],
  ]);
});

test("a page navigation whose session token Clerk must refresh through its handshake is unavailable with INTERACTION_REQUIRED, and the handshake's headers reach the response", async () => {
  const fake = createFakeClerkBackend();

  fake.signIn("token_ada", "user_ada");
  fake.expire("token_ada");

  const { state, headers } = await getRequestSession(
    requestWith(
      {
        cookie: "__client_uat=1790000000; __session=token_ada",
        "sec-fetch-dest": "document",
      },
      { url: "https://app.anchor.example/dashboard" },
    ),
    { adapter: clerk({ sdk: fake.sdk }) },
  );

  expect(state).toMatchObject({
    status: "unavailable",
    error: { code: "INTERACTION_REQUIRED" },
  });
  expect([...headers]).toEqual([
    ["cache-control", "no-store"],
    [
      "location",
      "https://clerk.anchor.example/v1/client/handshake?redirect_url=https%3A%2F%2Fapp.anchor.example%2Fdashboard",
    ],
  ]);
});

test("a signed-out request state whose reason says Clerk could not verify the token is unavailable, never signed out", async () => {
  const reasons = [
    "jwk-remote-failed-to-load",
    "unexpected-error",
    "secret-key-invalid",
    "session-token-nbf",
    "dev-browser-missing",
  ];

  const states = await Promise.all(
    reasons.map(async (reason) => {
      const fake = createFakeClerkBackend();

      fake.signIn("token_ada", "user_ada");
      fake.failures.state = {
        status: "signed-out",
        reason,
        message: "",
        headers: new Headers(),
      };

      return {
        clerkState: fake.failures.state,
        state: (
          await getRequestSession(
            requestWith({ cookie: "__session=token_ada" }),
            {
              adapter: clerk({ sdk: fake.sdk }),
            },
          )
        ).state,
      };
    }),
  );

  expect(states.map(({ state }) => state)).toMatchObject(
    states.map(({ clerkState }) => ({
      status: "unavailable",
      error: {
        code: "READ_FAILED",
        cause: {
          message: `Clerk could not tell the request's session: ${clerkState.reason}.`,
          cause: clerkState,
        },
      },
    })),
  );
});

test("a failure to fetch the user from the Backend API is unavailable with the error as its cause", async () => {
  const fake = createFakeClerkBackend();
  const failure = new Error("Too Many Requests");

  fake.signIn("token_ada", "user_ada");
  fake.failures.getUser = failure;

  const { state } = await getRequestSession(
    requestWith({ cookie: "__session=token_ada" }),
    { adapter: clerk({ sdk: fake.sdk }) },
  );

  expect(state).toMatchObject({
    status: "unavailable",
    error: { code: "READ_FAILED", cause: failure },
  });
});

test("a mapper receives the Backend API user, and its result is the session's user", async () => {
  const fake = createFakeClerkBackend();

  fake.signIn("token_ada", "user_ada");

  const { state } = await getRequestSession(
    requestWith({ cookie: "__session=token_ada" }),
    {
      adapter: clerk({
        sdk: fake.sdk,
        user: (user) => ({ id: user.id, role: user.publicMetadata.role }),
      }),
    },
  );

  expect(state).toMatchObject({
    session: { user: { id: "user_ada", role: "editor" } },
  });
});
