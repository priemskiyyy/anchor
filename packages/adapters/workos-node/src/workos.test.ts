import { getRequestSession } from "@priemskiyyy/anchor-server";
import { expect, test } from "vitest";

import {
  COOKIE_PASSWORD,
  createFakeWorkos,
  requestWithCookie,
} from "src/fakeWorkos.fixture";
import { workos } from "src/workos";

test("creating the adapter reads and calls nothing on the WorkOS client", () => {
  const fake = createFakeWorkos();
  const touched: PropertyKey[] = [];

  const sdk = new Proxy(fake.sdk, {
    get: (target, key, receiver) => {
      touched.push(key);

      return Reflect.get(target, key, receiver);
    },
  });

  const adapter = workos({ sdk, cookiePassword: COOKIE_PASSWORD });

  expect(touched).toEqual([]);
  expect(adapter.native).toBe(sdk);
  expect(adapter.name).toBe("workos-node");
});

test("a request's sealed session reads as its WorkOS user, mapped as the client adapter maps it, with the organization and impersonator in the context", async () => {
  const fake = createFakeWorkos();

  fake.signIn("sealed_ada", "user_ada", {
    organizationId: "org_acme",
    impersonator: { email: "support@example.com", reason: "Ticket 42" },
  });

  const { state, headers } = await getRequestSession(
    requestWithCookie("theme=dark; wos-session=sealed_ada"),
    { adapter: workos({ sdk: fake.sdk, cookiePassword: COOKIE_PASSWORD }) },
  );

  expect(state).toEqual({
    status: "signed-in",
    session: {
      principal: { authority: "workos", subject: "user_ada", tenant: null },
      user: {
        id: "user_ada",
        email: "user_ada@example.com",
        emailVerified: true,
        firstName: "USER_ADA",
        lastName: "Lovelace",
        profilePictureUrl: null,
        externalId: null,
      },
      guest: false,
      impersonated: true,
    },
  });
  expect([...headers]).toEqual([]);
  expect(fake.loads).toEqual([
    { sessionData: "sealed_ada", cookiePassword: COOKIE_PASSWORD },
  ]);
  expect(fake.refreshes).toEqual([]);
});

test("the session context fingerprints the organization and the impersonator's email, as the client adapter's does", async () => {
  const fake = createFakeWorkos();
  const adapter = workos({ sdk: fake.sdk, cookiePassword: COOKIE_PASSWORD });

  fake.signIn("sealed_ada", "user_ada");
  fake.signIn("sealed_grace", "user_grace", {
    organizationId: "org_acme",
    impersonator: { email: "support@example.com", reason: null },
  });

  const [ada, grace] = await Promise.all(
    ["sealed_ada", "sealed_grace"].map((sealed) =>
      adapter.read({
        url: "https://app.example.com/",
        method: "GET",
        headers: new Headers({ cookie: `wos-session=${sealed}` }),
        responseHeaders: new Headers(),
        signal: new AbortController().signal,
      }),
    ),
  );

  expect(ada).toMatchObject({
    context: "[null,null]",
    impersonated: false,
  });
  expect(grace).toMatchObject({
    context: '["org_acme","support@example.com"]',
    impersonated: true,
  });
});

test("the sealed session is read from the cookie the options name, opened with the password they give", async () => {
  const fake = createFakeWorkos();

  fake.signIn("sealed_ada", "user_ada");

  const { state } = await getRequestSession(
    requestWithCookie("wos-session=sealed_grace; session=sealed_ada"),
    {
      adapter: workos({
        sdk: fake.sdk,
        cookie: "session",
        cookiePassword: COOKIE_PASSWORD,
      }),
    },
  );

  expect(state).toMatchObject({
    session: { principal: { subject: "user_ada" } },
  });
  expect(fake.loads).toEqual([
    { sessionData: "sealed_ada", cookiePassword: COOKIE_PASSWORD },
  ]);
});

test("an expired session is refreshed, and the response sets the newly sealed session in its cookie", async () => {
  const fake = createFakeWorkos();

  fake.signIn("sealed_ada", "user_ada", { organizationId: "org_acme" });
  fake.expire("sealed_ada");

  const { state, headers } = await getRequestSession(
    requestWithCookie("wos-session=sealed_ada"),
    { adapter: workos({ sdk: fake.sdk, cookiePassword: COOKIE_PASSWORD }) },
  );

  expect(state).toMatchObject({
    status: "signed-in",
    session: { principal: { subject: "user_ada" } },
  });
  expect(fake.refreshes).toEqual(["sealed_ada"]);
  expect(headers.getSetCookie()).toEqual([
    "wos-session=sealed_user_ada_1; Path=/; HttpOnly; Secure; SameSite=Lax",
  ]);
});

test("a refresh that seals no new session is signed in and leaves the cookie as the browser sent it", async () => {
  const fake = createFakeWorkos();

  fake.signIn("sealed_ada", "user_ada");
  fake.expire("sealed_ada");

  const { loadSealedSession } = fake.sdk.userManagement;

  const sdk = {
    userManagement: {
      loadSealedSession: (options: Parameters<typeof loadSealedSession>[0]) => {
        const sealed = loadSealedSession(options);

        return {
          ...sealed,
          refresh: async () => {
            const refresh = await sealed.refresh();

            if (!refresh.authenticated) {
              return refresh;
            }

            return { ...refresh, sealedSession: undefined };
          },
        };
      },
    },
  };

  const { state, headers } = await getRequestSession(
    requestWithCookie("wos-session=sealed_ada"),
    { adapter: workos({ sdk, cookiePassword: COOKIE_PASSWORD }) },
  );

  expect(state).toMatchObject({
    status: "signed-in",
    session: { principal: { subject: "user_ada" } },
  });
  expect(headers.getSetCookie()).toEqual([]);
});

test("a refresh followed by a step that fails is unavailable, and the newly sealed session still reaches the response", async () => {
  const fake = createFakeWorkos();
  const failure = new Error("The user store is down.");

  fake.signIn("sealed_ada", "user_ada");
  fake.expire("sealed_ada");

  const { state, headers } = await getRequestSession(
    requestWithCookie("wos-session=sealed_ada"),
    {
      adapter: workos({
        sdk: fake.sdk,
        cookiePassword: COOKIE_PASSWORD,
        user: () => {
          throw failure;
        },
      }),
    },
  );

  expect(state).toMatchObject({
    status: "unavailable",
    error: { code: "READ_FAILED", cause: failure },
  });
  expect(fake.refreshes).toEqual(["sealed_ada"]);
  expect(headers.getSetCookie()).toEqual([
    "wos-session=sealed_user_ada_1; Path=/; HttpOnly; Secure; SameSite=Lax",
  ]);
});

test("a request without the sealed session cookie, or with one WorkOS cannot open, is signed out without a refresh", async () => {
  const fake = createFakeWorkos();
  const adapter = workos({ sdk: fake.sdk, cookiePassword: COOKIE_PASSWORD });

  fake.signIn("sealed_ada", "user_ada");

  const [none, forged, wrongPassword] = await Promise.all([
    getRequestSession(requestWithCookie("theme=dark"), { adapter }),
    getRequestSession(requestWithCookie("wos-session=forged"), { adapter }),
    getRequestSession(requestWithCookie("wos-session=sealed_ada"), {
      adapter: workos({ sdk: fake.sdk, cookiePassword: "another-password" }),
    }),
  ]);

  expect([none.state, forged.state, wrongPassword.state]).toEqual([
    { status: "signed-out" },
    { status: "signed-out" },
    { status: "signed-out" },
  ]);
  expect(fake.refreshes).toEqual([]);
});

test("a refresh WorkOS refuses for good is signed out, and the response deletes the sealed session cookie", async () => {
  const fake = createFakeWorkos();

  fake.signIn("sealed_ada", "user_ada");
  fake.expire("sealed_ada");
  fake.failures.refresh = {
    authenticated: false,
    reason: "invalid_grant",
    retryable: false,
  };

  const { state, headers } = await getRequestSession(
    requestWithCookie("wos-session=sealed_ada"),
    { adapter: workos({ sdk: fake.sdk, cookiePassword: COOKIE_PASSWORD }) },
  );

  expect(state).toEqual({ status: "signed-out" });
  expect(headers.getSetCookie()).toEqual([
    "wos-session=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax",
  ]);
});

test("a refresh that failed for a reason that may pass is unavailable with WorkOS's error as its cause, never signed out", async () => {
  const fake = createFakeWorkos();
  const failure = new TypeError("fetch failed");

  fake.signIn("sealed_ada", "user_ada");
  fake.expire("sealed_ada");
  fake.failures.refresh = {
    authenticated: false,
    reason: "network_error",
    retryable: true,
    error: failure,
  };

  const { state, headers } = await getRequestSession(
    requestWithCookie("wos-session=sealed_ada"),
    { adapter: workos({ sdk: fake.sdk, cookiePassword: COOKIE_PASSWORD }) },
  );

  expect(state).toMatchObject({
    status: "unavailable",
    error: { code: "READ_FAILED", cause: failure },
  });
  expect([...headers]).toEqual([]);
});

test("a retryable refresh failure without an error of its own is unavailable with its reason", async () => {
  const fake = createFakeWorkos();

  fake.signIn("sealed_ada", "user_ada");
  fake.expire("sealed_ada");
  fake.failures.refresh = {
    authenticated: false,
    reason: "rate_limit_exceeded",
    retryable: true,
  };

  const { state } = await getRequestSession(
    requestWithCookie("wos-session=sealed_ada"),
    { adapter: workos({ sdk: fake.sdk, cookiePassword: COOKIE_PASSWORD }) },
  );

  expect(state).toMatchObject({
    status: "unavailable",
    error: {
      code: "READ_FAILED",
      cause: {
        message: "WorkOS could not refresh the session: rate_limit_exceeded.",
      },
    },
  });
});

test("a mapper receives the WorkOS user, and its result is the session's user", async () => {
  const fake = createFakeWorkos();

  fake.signIn("sealed_ada", "user_ada");

  const { state } = await getRequestSession(
    requestWithCookie("wos-session=sealed_ada"),
    {
      adapter: workos({
        sdk: fake.sdk,
        cookiePassword: COOKIE_PASSWORD,
        user: (user) => ({ id: user.id, plan: user.metadata.plan }),
      }),
    },
  );

  expect(state).toMatchObject({
    session: { user: { id: "user_ada", plan: "team" } },
  });
});
