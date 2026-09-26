import { Anchor } from "@priemskiyyy/anchor";
import type {
  AnchorDiagnosticType,
  AnchorSession,
  SessionState,
} from "@priemskiyyy/anchor";
import { expect, test } from "vitest";

import { accessToken } from "src/accessToken";
import { amplify } from "src/amplify";
import {
  COGNITO_ISSUER,
  createFakeAmplifyAuth,
} from "src/fakeAmplifyAuth.fixture";
import { idToken } from "src/idToken";

const create = (options: Parameters<typeof createFakeAmplifyAuth>[0] = {}) => {
  const fake = createFakeAmplifyAuth(options);

  const anchor = new Anchor({
    adapter: amplify({
      sdk: fake.sdk,
      tokens: { api: accessToken(), identity: idToken() },
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

const getSubject = <TUser, TProfile extends string>(
  state: SessionState<TUser, TProfile>,
) => (state.status === "signed-in" ? state.session.principal.subject : null);

const countReads = (events: AnchorDiagnosticType[]) =>
  events.filter((type) => type === "read started").length;

const flushMicrotasks = async () => {
  for (let turn = 0; turn < 20; turn += 1) {
    await Promise.resolve();
  }
};

test("creating the adapter reads, listens to and calls nothing on Amplify", () => {
  const fake = createFakeAmplifyAuth();
  const touched: PropertyKey[] = [];

  const sdk = new Proxy(fake.sdk, {
    get: (target, key, receiver) => {
      touched.push(key);

      return Reflect.get(target, key, receiver);
    },
  });

  const adapter = amplify({ sdk });

  expect(touched).toEqual([]);
  expect(adapter.native).toBe(sdk);
  expect(adapter.name).toBe("amplify");
  expect(adapter.tokens).toEqual({});
  expect(fake.listeners()).toBe(0);
});

test("a signed-in user is the session: the ID token's issuer and subject name the principal, and getCurrentUser's user is its user", async () => {
  const { fake, anchor } = create();

  fake.signIn("ada", { username: "ada.lovelace" });
  await anchor.start();

  const session = getSignedInSession(anchor.session.get());

  expect(session.principal).toEqual({
    authority: COGNITO_ISSUER,
    subject: "ada",
    tenant: null,
  });
  expect(session.user).toEqual({
    username: "ada.lovelace",
    userId: "ada",
    signInDetails: {
      loginId: "ada@example.com",
      authFlowType: "USER_SRP_AUTH",
    },
  });
  expect(session.guest).toBe(false);
  expect(session.impersonated).toBe(false);
});

test("the default user of a sign-in Amplify stored no sign-in details for says so with null", async () => {
  const { fake, anchor } = create();

  fake.signIn("ada", { signInDetails: false });
  await anchor.start();

  expect(getSignedInSession(anchor.session.get()).user).toEqual({
    username: "ada",
    userId: "ada",
    signInDetails: null,
  });
});

test("no signed-in user is signed out on getCurrentUser's own word", async () => {
  const { anchor } = create();

  await anchor.start();

  expect(anchor.session.get()).toEqual({ status: "signed-out" });
});

test("an Amplify without a configured user pool is unavailable, never signed out", async () => {
  const { anchor } = create({ configured: false });

  await anchor.start();

  expect(anchor.session.get()).toMatchObject({
    status: "unavailable",
    error: { code: "READ_FAILED", cause: { name: "AuthUserPoolException" } },
  });
});

test("a sign-in, a token refresh and a failed refresh ask for a read through the Hub, and a sign-out is pushed as signed out without one", async () => {
  const { fake, anchor, events } = create();

  await anchor.start();

  const reads = countReads(events);

  fake.signIn("ada");

  await expect.poll(() => getSubject(anchor.session.get())).toBe("ada");
  expect(countReads(events)).toBe(reads + 1);

  fake.dispatch("tokenRefresh");
  await expect.poll(() => countReads(events)).toBe(reads + 2);

  fake.dispatch("tokenRefresh_failure");
  await expect.poll(() => countReads(events)).toBe(reads + 3);
  await expect.poll(() => events.at(-1)).toBe("read completed");

  await fake.sdk.auth.signOut({ global: false });

  expect(anchor.session.get()).toEqual({ status: "signed-out" });

  await flushMicrotasks();

  expect(countReads(events)).toBe(reads + 3);
});

test("the same user signed in again, with a new origin_jti, is a new session, and a refresh keeps the key", async () => {
  const { fake, anchor } = create();

  fake.signIn("ada");
  await anchor.start();

  const first = getSignedInSession(anchor.session.get());

  fake.signIn("ada");

  await expect
    .poll(() => getSignedInSession(anchor.session.get()).key)
    .not.toBe(first.key);

  const second = getSignedInSession(anchor.session.get());

  await second.getToken("api", { forceRefresh: true });
  await flushMicrotasks();

  expect(getSignedInSession(anchor.session.get()).key).toBe(second.key);
});

test("a mapper receives getCurrentUser's user and its result is the session's user", async () => {
  const fake = createFakeAmplifyAuth();

  const anchor = new Anchor({
    adapter: amplify({
      sdk: fake.sdk,
      user: (user) => ({
        id: user.userId,
        loginId: user.signInDetails?.loginId ?? null,
      }),
    }),
  });

  fake.signIn("ada");
  await anchor.start();

  expect(getSignedInSession(anchor.session.get()).user).toEqual({
    id: "ada",
    loginId: "ada@example.com",
  });
});

test("a user whose session carries no ID token cannot be named, so the first state is unavailable, never signed out", async () => {
  const { fake, anchor } = create();

  fake.signIn("ada", { idToken: false });
  await anchor.start();

  expect(anchor.session.get()).toMatchObject({
    status: "unavailable",
    error: { code: "READ_FAILED", cause: expect.any(TypeError) },
  });
});

test("the access and ID token profiles mint from fetchAuthSession for the session they belong to, refreshing when forced", async () => {
  const { fake, anchor } = create();

  fake.signIn("ada");
  await anchor.start();

  const session = getSignedInSession(anchor.session.get());

  await expect(session.getToken("api")).resolves.toEqual({
    value: "access.ada.1",
    kind: "access-token",
    scheme: "Bearer",
  });
  await expect(
    session.getToken("identity", { forceRefresh: true }),
  ).resolves.toEqual({ value: "id.ada.2", kind: "id-token", scheme: null });
  expect(getSignedInSession(anchor.session.get()).key).toBe(session.key);
});

test("a token asked for a user Amplify no longer holds is refused with SESSION_CHANGED", async () => {
  const { fake, anchor } = create();

  fake.signIn("ada");
  await anchor.start();

  const ada = getSignedInSession(anchor.session.get());

  fake.switchSilently("grace");

  await expect(
    ada.getToken("api", { forceRefresh: true }),
  ).rejects.toMatchObject({ code: "SESSION_CHANGED" });
});

test("a forced refresh Cognito refuses with NotAuthorizedException clears Amplify's tokens, so the token rejects with SESSION_CHANGED and the session is signed out", async () => {
  const { fake, anchor } = create();

  fake.signIn("ada");
  await anchor.start();

  fake.failures.refresh = Object.assign(
    new Error("Refresh Token has been revoked"),
    { name: "NotAuthorizedException" },
  );

  await expect(
    getSignedInSession(anchor.session.get()).getToken("api", {
      forceRefresh: true,
    }),
  ).rejects.toMatchObject({ code: "SESSION_CHANGED" });
  await expect
    .poll(() => anchor.session.get())
    .toEqual({ status: "signed-out" });
});

test("any other refresh failure is TOKEN_FAILED with Amplify's error as its cause, and the session stays", async () => {
  const { fake, anchor } = create();

  fake.signIn("ada");
  await anchor.start();

  const session = getSignedInSession(anchor.session.get());
  const offline = new TypeError("fetch failed");

  fake.failures.refresh = offline;

  await expect(
    session.getToken("api", { forceRefresh: true }),
  ).rejects.toMatchObject({ code: "TOKEN_FAILED", cause: offline });
  await flushMicrotasks();

  expect(getSignedInSession(anchor.session.get()).key).toBe(session.key);
});

test("ending signs this device out with global false and is complete locally once Amplify dispatched signedOut", async () => {
  const { fake, anchor } = create();

  fake.signIn("ada");
  await anchor.start();

  await expect(getSignedInSession(anchor.session.get()).end()).resolves.toEqual(
    { local: "completed", remote: "unknown", navigation: null },
  );
  expect(fake.signOuts).toEqual([{ global: false }]);
  expect(fake.session()).toBe(null);
  expect(anchor.session.get()).toEqual({ status: "signed-out" });
});

test("a signOut() that returns without signing out, as on React Native when the user closes the hosted UI's logout page, leaves the local outcome unknown and keeps the session", async () => {
  const { fake, anchor } = create();

  fake.signIn("ada");
  await anchor.start();

  const ada = getSignedInSession(anchor.session.get());

  fake.closeLogoutPage();

  await expect(ada.end()).resolves.toEqual({
    local: "unknown",
    remote: "unknown",
    navigation: null,
  });
  await flushMicrotasks();

  expect(getSignedInSession(anchor.session.get()).key).toBe(ada.key);
});

test("ending a user Amplify no longer holds signs nobody out", async () => {
  const { fake, anchor } = create();

  fake.signIn("ada");
  await anchor.start();

  const ada = getSignedInSession(anchor.session.get());

  fake.switchSilently("grace");

  await expect(ada.end()).resolves.toEqual({
    local: "not-applicable",
    remote: "not-applicable",
    navigation: null,
  });
  expect(fake.signOuts).toEqual([]);
  expect(fake.session()?.user.userId).toBe("grace");
});

test("a sign-out that fails is END_FAILED with Amplify's error as its cause, and the session stays", async () => {
  const { fake, anchor } = create();

  fake.signIn("ada");
  await anchor.start();

  const failure = Object.assign(new Error("OAuth sign-out failed"), {
    name: "OAuthSignOutException",
  });

  fake.failures.signOut = failure;

  await expect(
    getSignedInSession(anchor.session.get()).end(),
  ).rejects.toMatchObject({ code: "END_FAILED", cause: failure });
  expect(getSubject(anchor.session.get())).toBe("ada");
});

test("dispose stops exactly the adapter's Hub listener, and the application's own keeps hearing Amplify", async () => {
  const { fake, anchor } = create();
  const heard: string[] = [];

  fake.sdk.hub.listen("auth", ({ payload }) => heard.push(payload.event));
  await anchor.start();

  expect(fake.listeners()).toBe(2);

  anchor.dispose();

  expect(fake.listeners()).toBe(1);

  fake.signIn("ada");

  expect(heard).toEqual(["signedIn"]);
});

test("an ID token without an issuer is outside the contract, so the first state is unavailable", async () => {
  const fake = createFakeAmplifyAuth();

  fake.signIn("ada");

  const sdk = {
    ...fake.sdk,
    auth: {
      ...fake.sdk.auth,
      fetchAuthSession: async () => ({
        tokens: {
          accessToken: { payload: { sub: "ada" }, toString: () => "access" },
          idToken: { payload: { sub: "ada" }, toString: () => "id" },
        },
      }),
    },
  };

  const anchor = new Anchor({ adapter: amplify({ sdk }) });

  await anchor.start();

  expect(anchor.session.get()).toMatchObject({
    status: "unavailable",
    error: { code: "INVALID_ANSWER" },
  });
});
