import { Anchor } from "@priemskiyyy/anchor";
import type {
  AnchorDiagnosticType,
  AnchorSession,
  SessionState,
} from "@priemskiyyy/anchor";
import { expect, test } from "vitest";

import { accessToken } from "src/accessToken";
import { createFakeAuthKitClient } from "src/fakeAuthKitClient.fixture";
import { workos } from "src/workos";
import { workosRefreshes } from "src/workosRefreshes";

const create = () => {
  const fake = createFakeAuthKitClient();

  const anchor = new Anchor({
    adapter: workos({
      sdk: fake.sdk,
      refreshes: fake.refreshes,
      tokens: { api: accessToken() },
    }),
  });

  const events: AnchorDiagnosticType[] = [];

  anchor.diagnostics.events.subscribe(({ type }) => events.push(type));

  return { fake, anchor, events };
};

const getSignedInSession = <TUser, TProfile extends string>(
  state: SessionState<TUser, TProfile>,
): AnchorSession<TUser, TProfile> => {
  if (state.status !== "signed-in") {
    throw new Error(`Expected a session, got ${state.status}.`);
  }

  return state.session;
};

test("creating the adapter reads, subscribes to and calls nothing on the client or its refreshes", () => {
  const fake = createFakeAuthKitClient();
  const touched: PropertyKey[] = [];

  const track = <TTarget extends object>(target: TTarget) =>
    new Proxy(target, {
      get: (object, key, receiver) => {
        touched.push(key);

        return Reflect.get(object, key, receiver);
      },
    });

  const sdk = track(fake.sdk);
  const adapter = workos({ sdk, refreshes: track(fake.refreshes) });

  expect(touched).toEqual([]);
  expect(adapter.native).toBe(sdk);
  expect(adapter.name).toBe("workos");
  expect(adapter.tokens).toEqual({});
  expect(fake.listeners()).toBe(0);
});

test("the user AuthKit holds is a session of its id, in the organization and with the impersonator of the latest refresh", async () => {
  const { fake, anchor } = create();

  fake.signIn("user_ada", {
    organization: "org_acme",
    impersonator: "support@example.com",
  });
  await anchor.start();

  const session = getSignedInSession(anchor.session.get());

  expect(session.principal).toEqual({
    authority: "workos",
    subject: "user_ada",
    tenant: null,
  });
  expect(session.guest).toBe(false);
  expect(session.impersonated).toBe(true);
  expect(session.user).toEqual({
    id: "user_ada",
    email: "user_ada@example.com",
    emailVerified: true,
    firstName: "USER_ADA",
    lastName: null,
    profilePictureUrl: null,
    externalId: null,
  });
});

test("a visitor AuthKit holds no session for is signed out only once WorkOS refused the refresh", async () => {
  const { fake, anchor } = create();

  await anchor.start();

  expect(anchor.session.get()).toEqual({ status: "signed-out" });
  expect(fake.refreshRequests).toEqual([{ organizationId: undefined }]);

  await anchor.sync();

  expect(fake.refreshRequests).toHaveLength(1);
});

test("a first refresh that failed on the network is no evidence of signing out: the first state is unavailable until a read gets through", async () => {
  const { fake, anchor } = create();
  const failure = new TypeError("Failed to fetch");

  fake.restoreOffline("user_ada", failure);
  await anchor.start();

  expect(anchor.session.get()).toMatchObject({
    status: "unavailable",
    error: { code: "READ_FAILED", cause: failure },
  });

  fake.failures.refresh = null;
  await anchor.sync();

  expect(getSignedInSession(anchor.session.get()).principal.subject).toBe(
    "user_ada",
  );
});

test("an organization switch reaches the session as a new session through the refresh it makes, and a plain refresh keeps the key", async () => {
  const { fake, anchor, events } = create();

  fake.signIn("user_ada", { organization: "org_acme" });
  await anchor.start();

  const acme = getSignedInSession(anchor.session.get());
  const reads = events.filter((type) => type === "read completed").length;

  fake.switchToOrganization("org_globex");

  await expect
    .poll(() => getSignedInSession(anchor.session.get()).key)
    .not.toBe(acme.key);

  const globex = getSignedInSession(anchor.session.get());

  fake.expire();
  fake.refreshAutomatically();

  await expect
    .poll(() => events.filter((type) => type === "read completed").length)
    .toBe(reads + 2);
  expect(getSignedInSession(anchor.session.get()).key).toBe(globex.key);
});

test("a session WorkOS ended reaches Anchor as signed out once AuthKit's refresh fails", async () => {
  const { fake, anchor } = create();

  fake.signIn("user_ada");
  await anchor.start();
  fake.endAtWorkos();
  fake.expire();
  fake.refreshAutomatically();

  await expect
    .poll(() => anchor.session.get())
    .toEqual({ status: "signed-out" });
});

test("a user whose refresh the adapter never heard is refused, since its organization is unknown", async () => {
  const fake = createFakeAuthKitClient();

  const anchor = new Anchor({
    adapter: workos({ sdk: fake.sdk, refreshes: workosRefreshes() }),
  });

  fake.signIn("user_ada");
  await anchor.start();

  expect(anchor.session.get()).toMatchObject({
    status: "unavailable",
    error: { code: "READ_FAILED", cause: expect.any(TypeError) },
  });
});

test("a mapper receives the AuthKit user and its result is the session's user", async () => {
  const fake = createFakeAuthKitClient();

  const anchor = new Anchor({
    adapter: workos({
      sdk: fake.sdk,
      refreshes: fake.refreshes,
      user: (user) => ({ id: user.id, email: user.email }),
    }),
  });

  fake.signIn("user_ada");
  await anchor.start();

  expect(getSignedInSession(anchor.session.get()).user).toEqual({
    id: "user_ada",
    email: "user_ada@example.com",
  });
});

test("the profile answers the access token AuthKit holds, refreshes it when forced, and keeps the session", async () => {
  const { fake, anchor } = create();

  fake.signIn("user_ada", { organization: "org_acme" });
  await anchor.start();

  const session = getSignedInSession(anchor.session.get());

  await expect(session.getToken("api")).resolves.toEqual({
    value: "access.user_ada.1",
    kind: "access-token",
    scheme: "Bearer",
  });
  await expect(
    session.getToken("api", { forceRefresh: true }),
  ).resolves.toMatchObject({ value: "access.user_ada.2" });
  expect(fake.refreshRequests).toEqual([{ organizationId: undefined }]);
  expect(getSignedInSession(anchor.session.get()).key).toBe(session.key);
});

test("a token asked for a user AuthKit no longer holds is refused before AuthKit is asked", async () => {
  const { fake, anchor } = create();

  fake.signIn("user_ada");
  await anchor.start();

  const ada = getSignedInSession(anchor.session.get());

  fake.switchSilently("user_grace");

  await expect(
    ada.getToken("api", { forceRefresh: true }),
  ).rejects.toMatchObject({ code: "SESSION_CHANGED" });
  expect(fake.refreshRequests).toEqual([]);
});

test("a failure AuthKit keeps the session through is TOKEN_FAILED with its cause, and the session stays", async () => {
  const { fake, anchor } = create();

  fake.signIn("user_ada");
  await anchor.start();

  const session = getSignedInSession(anchor.session.get());

  const transient = Object.assign(new Error("Failed to refresh"), {
    name: "RefreshError",
    isTransient: true,
  });

  fake.failures.refresh = transient;

  await expect(
    session.getToken("api", { forceRefresh: true }),
  ).rejects.toMatchObject({ code: "TOKEN_FAILED", cause: transient });
  expect(getSignedInSession(anchor.session.get()).key).toBe(session.key);
});

test("a refresh WorkOS refuses clears AuthKit's session and reports it before the token rejects, so the session is signed out and the token is SESSION_CHANGED", async () => {
  const { fake, anchor } = create();

  fake.signIn("user_ada");
  await anchor.start();
  fake.endAtWorkos();

  await expect(
    getSignedInSession(anchor.session.get()).getToken("api", {
      forceRefresh: true,
    }),
  ).rejects.toMatchObject({ code: "SESSION_CHANGED" });
  expect(anchor.session.get()).toEqual({ status: "signed-out" });
});

test("ending signs AuthKit out without navigating, and the state is signed-out at once", async () => {
  const { fake, anchor } = create();

  fake.signIn("user_ada");
  await anchor.start();

  await expect(getSignedInSession(anchor.session.get()).end()).resolves.toEqual(
    { local: "completed", remote: "unknown", navigation: null },
  );
  expect(fake.logouts).toEqual([{ session: "session_1", navigate: false }]);
  expect(anchor.session.get()).toEqual({ status: "signed-out" });
});

test("a logout request WorkOS never got leaves its session, which the next read finds again", async () => {
  const { fake, anchor } = create();

  fake.signIn("user_ada");
  await anchor.start();
  fake.failures.logout = true;

  await expect(getSignedInSession(anchor.session.get()).end()).resolves.toEqual(
    { local: "completed", remote: "unknown", navigation: null },
  );
  expect(anchor.session.get()).toEqual({ status: "signed-out" });

  await anchor.sync();

  expect(getSignedInSession(anchor.session.get()).principal.subject).toBe(
    "user_ada",
  );
});

test("ending a session AuthKit no longer holds signs nobody out", async () => {
  const { fake, anchor } = create();

  fake.signIn("user_ada");
  await anchor.start();

  const ada = getSignedInSession(anchor.session.get());

  fake.switchSilently("user_grace");

  await expect(ada.end()).resolves.toEqual({
    local: "not-applicable",
    remote: "not-applicable",
    navigation: null,
  });
  expect(fake.logouts).toEqual([]);
});

test("dispose unsubscribes the adapter from the refreshes, and the application's own listener keeps hearing them", async () => {
  const { fake, anchor } = create();
  const heard: string[] = [];

  fake.refreshes.subscribe(() => heard.push("refresh"));
  await anchor.start();

  expect(fake.listeners()).toBe(2);

  anchor.dispose();

  expect(fake.listeners()).toBe(1);

  fake.signIn("user_ada");

  expect(heard).toEqual(["refresh"]);
});
