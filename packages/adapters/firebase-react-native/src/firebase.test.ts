import { Anchor } from "@priemskiyyy/anchor";
import type {
  AnchorDiagnosticType,
  AnchorSession,
  SessionState,
} from "@priemskiyyy/anchor";
import { expect, test } from "vitest";

import { createFakeFirebaseAuth } from "src/fakeFirebaseAuth.fixture";
import { firebase } from "src/firebase";
import { idToken } from "src/idToken";

const create = (options: Parameters<typeof createFakeFirebaseAuth>[0] = {}) => {
  const fake = createFakeFirebaseAuth(options);

  const anchor = new Anchor({
    adapter: firebase({ sdk: fake.sdk, tokens: { api: idToken() } }),
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

const flushMicrotasks = async () => {
  for (let turn = 0; turn < 20; turn += 1) {
    await Promise.resolve();
  }
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
  expect(adapter.name).toBe("firebase-react-native");
  expect(adapter.tokens).toEqual({});
  expect(fake.listeners()).toBe(0);
});

test("the first read waits for authStateReady, so a native SDK still restoring its user is initializing, never signed out", async () => {
  const { fake, anchor, events } = create({ restored: false });
  const started = anchor.start();

  await flushMicrotasks();

  expect(anchor.session.get()).toEqual({ status: "initializing" });
  expect(events).not.toContain("read completed");

  fake.restore("ada");
  await started;

  expect(getSignedInSession(anchor.session.get()).principal.subject).toBe(
    "ada",
  );
});

test("a native SDK that restored no user is signed out", async () => {
  const { fake, anchor } = create({ restored: false });
  const started = anchor.start();

  fake.restore(null);
  await started;

  expect(anchor.session.get()).toEqual({ status: "signed-out" });
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

test("every change onIdTokenChanged reports reaches the session without a read", async () => {
  const { fake, anchor, events } = create();

  await anchor.start();

  expect(anchor.session.get()).toEqual({ status: "signed-out" });

  const reads = events.filter((type) => type === "read started").length;

  fake.signIn("ada");

  const ada = getSignedInSession(anchor.session.get());

  fake.signIn("grace");

  expect(getSignedInSession(anchor.session.get()).key).not.toBe(ada.key);

  await fake.sdk.signOut();

  expect(anchor.session.get()).toEqual({ status: "signed-out" });
  expect(events.filter((type) => type === "read started").length).toBe(reads);
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

test("a mapper that throws never keeps a change from the application's own listeners, and the session is read instead", async () => {
  const fake = createFakeFirebaseAuth();

  const anchor = new Anchor({
    adapter: firebase({
      sdk: fake.sdk,
      user: (user) => {
        if (user.uid === "grace") {
          throw new Error("The mapper cannot map grace.");
        }

        return { id: user.uid };
      },
    }),
  });

  const events: AnchorDiagnosticType[] = [];

  anchor.diagnostics.events.subscribe(({ type }) => events.push(type));
  fake.signIn("ada");
  await anchor.start();

  const heard: (string | null)[] = [];

  fake.sdk.onIdTokenChanged((user) => heard.push(user?.uid ?? null));
  await flushMicrotasks();

  expect(() => fake.signIn("grace")).not.toThrow();
  expect(heard).toEqual(["ada", "grace"]);
  await expect.poll(() => events.includes("read failed")).toBe(true);
  expect(getSignedInSession(anchor.session.get()).user).toEqual({ id: "ada" });
});

test("a profile mints the session user's ID token as a bearer id-token, forced when asked", async () => {
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
  ).resolves.toEqual({
    value: "id-token.ada.2",
    kind: "id-token",
    scheme: "Bearer",
  });
  expect(fake.mints).toEqual([
    { uid: "ada", forceRefresh: false },
    { uid: "ada", forceRefresh: true },
  ]);
});

test("a token asked for a user React Native Firebase no longer holds is refused before it is minted", async () => {
  const { fake, anchor } = create();

  fake.signIn("ada");
  await anchor.start();

  const ada = getSignedInSession(anchor.session.get());

  fake.switchSilently("grace");

  await expect(ada.getToken("api")).rejects.toMatchObject({
    code: "SESSION_CHANGED",
  });
  expect(fake.mints).toEqual([]);
});

test("a token the native SDK mints for another user, before JavaScript heard of the switch, is refused with SESSION_CHANGED", async () => {
  const { fake, anchor } = create();

  fake.signIn("ada");
  await anchor.start();

  const ada = getSignedInSession(anchor.session.get());

  fake.switchNatively("grace");

  await expect(ada.getToken("api")).rejects.toMatchObject({
    code: "SESSION_CHANGED",
  });
  expect(fake.mints).toEqual([{ uid: "grace", forceRefresh: false }]);
});

test("a token the native SDK cannot mint because it already holds no user is refused with SESSION_CHANGED", async () => {
  const { fake, anchor } = create();

  fake.signIn("ada");
  await anchor.start();

  fake.signOutNatively();

  await expect(
    getSignedInSession(anchor.session.get()).getToken("api"),
  ).rejects.toMatchObject({
    code: "SESSION_CHANGED",
    cause: { code: "auth/no-current-user" },
  });
});

test("an expired credential asks for the user with INTERACTION_REQUIRED, and any other failure is TOKEN_FAILED with its cause", async () => {
  const { fake, anchor } = create();

  fake.signIn("ada");
  await anchor.start();

  const session = getSignedInSession(anchor.session.get());

  const expired = Object.assign(
    new Error(
      "[auth/user-token-expired] The user's credential is no longer valid.",
    ),
    { code: "auth/user-token-expired" },
  );

  fake.failures.token = expired;

  await expect(session.getToken("api")).rejects.toMatchObject({
    code: "INTERACTION_REQUIRED",
    cause: expired,
  });

  const offline = Object.assign(
    new Error("[auth/network-request-failed] A network error has occurred."),
    { code: "auth/network-request-failed" },
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

test("ending a session React Native Firebase no longer holds signs nobody out", async () => {
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

test("ending after the native SDK signed out on its own, before JavaScript heard of it, does not apply", async () => {
  const { fake, anchor } = create();

  fake.signIn("ada");
  await anchor.start();

  fake.signOutNatively();

  await expect(getSignedInSession(anchor.session.get()).end()).resolves.toEqual(
    {
      local: "not-applicable",
      remote: "not-applicable",
      navigation: null,
    },
  );
});

test("a sign-out the native SDK refuses for another reason ends nothing: END_FAILED, and the user stays", async () => {
  const { fake, anchor } = create();

  fake.signIn("ada");
  await anchor.start();

  const failure = Object.assign(new Error("[auth/internal-error] Boom."), {
    code: "auth/internal-error",
  });

  fake.failures.signOut = failure;

  await expect(
    getSignedInSession(anchor.session.get()).end(),
  ).rejects.toMatchObject({ code: "END_FAILED", cause: failure });
  expect(fake.current()?.uid).toBe("ada");
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

  expect(fake.listeners()).toBe(1);

  anchor.dispose();

  expect(fake.listeners()).toBe(0);
});
