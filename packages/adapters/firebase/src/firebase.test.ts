import { Anchor } from "@priemskiyyy/anchor";
import type { AnchorSession, SessionState } from "@priemskiyyy/anchor";
import { expect, test } from "vitest";

import { createFakeFirebaseAuth } from "src/fakeFirebaseAuth.fixture";
import { firebase } from "src/firebase";
import { idToken } from "src/idToken";

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

const create = (options: Parameters<typeof createFakeFirebaseAuth>[0] = {}) => {
  const fake = createFakeFirebaseAuth(options);

  const anchor = new Anchor({
    adapter: firebase({ sdk: fake.sdk, tokens: { api: idToken() } }),
  });

  return { fake, anchor };
};

const getSignedInSession = <TUser, TProfile extends string>(
  state: SessionState<TUser, TProfile>,
): AnchorSession<TUser, TProfile> => {
  if (state.status !== "signed-in") {
    throw new Error(`Expected a session, got ${state.status}.`);
  }

  return state.session;
};

test("creating the adapter reads, subscribes to and calls nothing on the SDK", () => {
  const fake = createFakeFirebaseAuth();
  const touched: PropertyKey[] = [];

  const sdk = new Proxy(fake.sdk, {
    get: (target, key, receiver) => {
      touched.push(key);

      return Reflect.get(target, key, receiver);
    },
  });

  const adapter = firebase({ sdk });

  expect(touched).toEqual([]);
  expect(adapter.native).toBe(sdk);
  expect(adapter.name).toBe("firebase");
});

test("the first read waits for authStateReady, so a restoring SDK is initializing, never signed out", async () => {
  const { fake, anchor } = create({ restored: false });
  const started = anchor.start();

  await tick();

  expect(anchor.session.get()).toEqual({ status: "initializing" });

  fake.restore("ada");
  await started;

  expect(getSignedInSession(anchor.session.get()).principal.subject).toBe(
    "ada",
  );
});

test("a Firebase user is a session of the project's issuer and the uid, whose user is a snapshot of the profile", async () => {
  const { fake, anchor } = create();

  fake.signIn("ada");
  await anchor.start();

  const session = getSignedInSession(anchor.session.get());

  expect(session.principal).toEqual({
    authority: "https://securetoken.google.com/anchor-demo",
    subject: "ada",
    tenant: null,
  });
  expect(session.user).toEqual({
    uid: "ada",
    email: "ada@example.com",
    emailVerified: true,
    displayName: "ADA",
    photoURL: null,
    phoneNumber: null,
  });
  expect(session.guest).toBe(false);
  expect(session.impersonated).toBe(false);
});

test("a user of an Identity Platform tenant carries the tenant", async () => {
  const { fake, anchor } = create();

  fake.signIn("ada", { tenantId: "acme" });
  await anchor.start();

  expect(getSignedInSession(anchor.session.get()).principal.tenant).toBe(
    "acme",
  );
});

test("an anonymous user is a guest session, and linking it to an account replaces the session", async () => {
  const { fake, anchor } = create();

  fake.signIn("ada", { anonymous: true });
  await anchor.start();

  const guest = getSignedInSession(anchor.session.get());

  expect(guest.guest).toBe(true);

  fake.link();

  const linked = getSignedInSession(anchor.session.get());

  expect(linked.guest).toBe(false);
  expect(linked.principal.subject).toBe("ada");
  expect(linked.key).not.toBe(guest.key);
});

test("every change onIdTokenChanged reports reaches the session", async () => {
  const { fake, anchor } = create();

  await anchor.start();

  expect(anchor.session.get()).toEqual({ status: "signed-out" });

  fake.signIn("ada");

  const ada = getSignedInSession(anchor.session.get());

  fake.signIn("grace");

  expect(getSignedInSession(anchor.session.get()).key).not.toBe(ada.key);

  await fake.sdk.signOut();

  expect(anchor.session.get()).toEqual({ status: "signed-out" });
});

test("a mapper receives the Firebase user and its result is the session's user", async () => {
  const fake = createFakeFirebaseAuth();

  const anchor = new Anchor({
    adapter: firebase({
      sdk: fake.sdk,
      user: (user) => ({ id: user.uid, verified: user.emailVerified }),
    }),
  });

  fake.signIn("ada");
  await anchor.start();

  expect(getSignedInSession(anchor.session.get()).user).toEqual({
    id: "ada",
    verified: true,
  });
});

test("a profile mints the current user's ID token as a bearer id-token, forced when asked", async () => {
  const { fake, anchor } = create();

  fake.signIn("ada");
  await anchor.start();

  const session = getSignedInSession(anchor.session.get());

  await expect(session.getToken("api")).resolves.toEqual({
    value: "id-token.ada.1",
    kind: "id-token",
    scheme: "Bearer",
  });
  await expect(
    session.getToken("api", { forceRefresh: true }),
  ).resolves.toMatchObject({
    value: "id-token.ada.2",
  });
  expect(fake.current()?.minted).toEqual({ count: 2, forced: 1 });
});

test("a token asked for a user Firebase no longer holds is refused before it is minted", async () => {
  const { fake, anchor } = create();

  fake.signIn("ada");
  await anchor.start();

  const ada = getSignedInSession(anchor.session.get());

  fake.switchSilently("grace");

  await expect(ada.getToken("api")).rejects.toMatchObject({
    code: "SESSION_CHANGED",
  });
  expect(fake.current()?.minted.count).toBe(0);
});

test("an expired credential asks for the user with INTERACTION_REQUIRED, and any other failure is TOKEN_FAILED with its cause", async () => {
  const { fake, anchor } = create();

  fake.signIn("ada");
  await anchor.start();

  const session = getSignedInSession(anchor.session.get());

  const expired = Object.assign(
    new Error("Firebase: Error (auth/user-token-expired)."),
    {
      code: "auth/user-token-expired",
    },
  );

  fake.failures.token = expired;

  await expect(session.getToken("api")).rejects.toMatchObject({
    code: "INTERACTION_REQUIRED",
    cause: expired,
  });

  const offline = Object.assign(
    new Error("Firebase: Error (auth/network-request-failed)."),
    {
      code: "auth/network-request-failed",
    },
  );

  fake.failures.token = offline;

  await expect(session.getToken("api")).rejects.toMatchObject({
    code: "TOKEN_FAILED",
    cause: offline,
  });
});

test("ending signs the current user out and says the client has no remote step", async () => {
  const { fake, anchor } = create();

  fake.signIn("ada");
  await anchor.start();

  await expect(getSignedInSession(anchor.session.get()).end()).resolves.toEqual(
    {
      local: "completed",
      remote: "not-applicable",
      navigation: null,
    },
  );
  expect(fake.current()).toBe(null);
  expect(anchor.session.get()).toEqual({ status: "signed-out" });
});

test("ending a session Firebase no longer holds signs nobody out", async () => {
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
  expect(fake.current()?.uid).toBe("grace");
});

test("an app without a projectId cannot start, and INVALID_CONFIGURATION says why", async () => {
  const { anchor } = create({ projectId: "" });

  await expect(anchor.start()).rejects.toMatchObject({
    code: "START_FAILED",
    cause: expect.objectContaining({
      code: "INVALID_CONFIGURATION",
      message:
        "The Firebase app has no projectId, which names the issuer of its ID tokens.",
    }),
  });
});

test("dispose removes the onIdTokenChanged listener", async () => {
  const { fake, anchor } = create();

  await anchor.start();

  expect(fake.listeners.size).toBe(1);

  anchor.dispose();

  expect(fake.listeners.size).toBe(0);
});
