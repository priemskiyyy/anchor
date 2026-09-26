import { getRequestSession } from "@priemskiyyy/anchor-server";
import { APIError } from "better-auth/api";
import { expect, test } from "vitest";

import { betterAuth } from "src/betterAuth";
import {
  createFakeBetterAuthServer,
  requestWithSessionToken,
} from "src/fakeBetterAuthServer.fixture";

test("creating the adapter reads and calls nothing on the server instance", () => {
  const fake = createFakeBetterAuthServer();
  const touched: PropertyKey[] = [];

  const sdk = new Proxy(fake.sdk, {
    get: (target, key, receiver) => {
      touched.push(key);

      return Reflect.get(target, key, receiver);
    },
  });

  const adapter = betterAuth({ sdk });

  expect(touched).toEqual([]);
  expect(adapter.native).toBe(sdk);
  expect(adapter.name).toBe("better-auth-node");
});

test("a request's session cookie reads as its user, mapped as the client adapter maps it, with Better Auth's headers for the response", async () => {
  const fake = createFakeBetterAuthServer();

  fake.signIn("token_ada", "user_ada");

  const { state, headers } = await getRequestSession(
    requestWithSessionToken("token_ada"),
    { adapter: betterAuth({ sdk: fake.sdk }) },
  );

  expect(state).toEqual({
    status: "signed-in",
    session: {
      principal: {
        authority: "better-auth",
        subject: "user_ada",
        tenant: null,
      },
      user: {
        id: "user_ada",
        name: "USER_ADA",
        email: "user_ada@example.com",
        emailVerified: true,
        image: null,
      },
      guest: false,
      impersonated: false,
    },
  });
  expect(headers.getSetCookie()).toEqual([
    "better-auth.session_data=token_ada; Path=/; HttpOnly; SameSite=Lax",
  ]);
});

test("a request without a session cookie is signed out", async () => {
  const fake = createFakeBetterAuthServer();

  const { state } = await getRequestSession(requestWithSessionToken(null), {
    adapter: betterAuth({ sdk: fake.sdk }),
  });

  expect(state).toEqual({ status: "signed-out" });
});

test("the 401 Better Auth throws after deleting a session it could not refresh is no session, and the cookies it deleted reach the response", async () => {
  const fake = createFakeBetterAuthServer();

  fake.signIn("token_ada", "user_ada");
  fake.failures.refresh = true;

  const { state, headers } = await getRequestSession(
    requestWithSessionToken("token_ada"),
    { adapter: betterAuth({ sdk: fake.sdk }) },
  );

  expect(state).toEqual({ status: "signed-out" });
  expect(headers.getSetCookie()).toEqual([
    "better-auth.session_token=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax",
    "better-auth.session_data=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax",
    "better-auth.dont_remember=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax",
  ]);
});

test("any other APIError is thrown on, with the headers its endpoint set still on the response", async () => {
  const fake = createFakeBetterAuthServer();

  const failure = Object.defineProperty(
    new APIError("INTERNAL_SERVER_ERROR"),
    Symbol.for("better-call:api-error-headers"),
    { value: new Headers([["cache-control", "no-store"]]) },
  );

  fake.failures.read = failure;

  const { state, headers } = await getRequestSession(
    requestWithSessionToken("token_ada"),
    { adapter: betterAuth({ sdk: fake.sdk }) },
  );

  expect(state).toMatchObject({
    status: "unavailable",
    error: { code: "READ_FAILED", cause: failure },
  });
  expect(headers.get("cache-control")).toBe("no-store");
});

test("any other failure cannot tell the session, so it is unavailable with the error as its cause", async () => {
  const fake = createFakeBetterAuthServer();
  const failure = new Error("The database is unreachable.");

  fake.failures.read = failure;

  const { state } = await getRequestSession(
    requestWithSessionToken("token_ada"),
    { adapter: betterAuth({ sdk: fake.sdk }) },
  );

  expect(state).toMatchObject({
    status: "unavailable",
    error: { code: "READ_FAILED", cause: failure },
  });
});

test("a mapper receives the Better Auth user, and its result is the session's user", async () => {
  const fake = createFakeBetterAuthServer();

  fake.signIn("token_ada", "user_ada");

  const { state } = await getRequestSession(
    requestWithSessionToken("token_ada"),
    {
      adapter: betterAuth({
        sdk: fake.sdk,
        user: (user) => ({ id: user.id, email: user.email }),
      }),
    },
  );

  expect(state).toMatchObject({
    session: { user: { id: "user_ada", email: "user_ada@example.com" } },
  });
});
