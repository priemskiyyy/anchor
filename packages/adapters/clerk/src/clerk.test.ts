import { Anchor } from "@priemskiyyy/anchor";
import type {
  AnchorDiagnosticType,
  AnchorSession,
  SessionState,
} from "@priemskiyyy/anchor";
import { expect, test, vi } from "vitest";

import { clerk } from "src/clerk";
import { createFakeClerk } from "src/fakeClerk.fixture";
import { sessionToken } from "src/sessionToken";

const create = (options: Parameters<typeof createFakeClerk>[0] = {}) => {
  const fake = createFakeClerk(options);

  const anchor = new Anchor({
    adapter: clerk({
      sdk: fake.sdk,
      tokens: {
        api: sessionToken(),
        supabase: sessionToken({ template: "supabase" }),
      },
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

const countReads = (events: AnchorDiagnosticType[]) =>
  events.filter((type) => type === "read started").length;

test("creating the adapter reads, subscribes to and calls nothing on the Clerk instance", () => {
  const fake = createFakeClerk();
  const touched: PropertyKey[] = [];

  const sdk = new Proxy(fake.sdk, {
    get: (target, key, receiver) => {
      touched.push(key);

      return Reflect.get(target, key, receiver);
    },
  });

  const adapter = clerk({ sdk });

  expect(touched).toEqual([]);
  expect(adapter.native).toBe(sdk);
  expect(adapter.name).toBe("clerk");
  expect(adapter.tokens).toEqual({});
  expect(fake.listeners()).toBe(0);
});

test("a Clerk still loading keeps the session initializing, never signed out, until load() finishes", async () => {
  const { fake, anchor } = create({ loaded: false });
  let isStarted = false;

  fake.signIn("user_ada");

  const started = anchor.start().then(() => {
    isStarted = true;
  });

  await Promise.resolve();

  expect(anchor.session.get()).toEqual({ status: "initializing" });
  expect(isStarted).toBe(false);

  fake.finishLoading();
  await started;

  expect(getSignedInSession(anchor.session.get()).principal).toEqual({
    authority: "https://clerk.example.com",
    subject: "user_ada",
    tenant: null,
  });
});

test("a load that failed is no evidence of signing out: the first state is unavailable", async () => {
  const { fake, anchor } = create({ loaded: false });
  const started = anchor.start();

  fake.failLoading();
  await started;

  expect(anchor.session.get()).toMatchObject({
    status: "unavailable",
    error: { code: "READ_FAILED" },
  });
});

test("the listener's first call pushes the session Clerk holds, and later sign-ins, switches and sign-outs are pushed without a read", async () => {
  const { fake, anchor, events } = create();

  await anchor.start();

  expect(anchor.session.get()).toEqual({ status: "signed-out" });

  const reads = countReads(events);

  fake.signIn("user_ada");

  const ada = getSignedInSession(anchor.session.get());

  expect(ada.principal.subject).toBe("user_ada");

  fake.setActiveOrganization("org_acme");

  expect(getSignedInSession(anchor.session.get()).key).not.toBe(ada.key);

  fake.endElsewhere();

  expect(anchor.session.get()).toEqual({ status: "signed-out" });
  expect(countReads(events)).toBe(reads);
});

test("the undefined session Clerk emits while it switches sessions is never taken for a sign-out", async () => {
  const { fake, anchor } = create();
  const statuses: string[] = [];

  fake.signIn("user_ada");
  await anchor.start();
  anchor.session.subscribe(() => statuses.push(anchor.session.get().status));
  fake.beginTransition();
  fake.signIn("user_grace");

  expect(statuses).toEqual(["signed-in"]);
  expect(getSignedInSession(anchor.session.get()).principal.subject).toBe(
    "user_grace",
  );
});

test("the undefined session Clerk emits while it switches sessions reaches the observer as neither an answer nor a reason to read", () => {
  const fake = createFakeClerk();
  const observer = { session: vi.fn(), invalidate: vi.fn() };

  fake.signIn("user_ada");
  clerk({ sdk: fake.sdk }).open(observer);
  fake.beginTransition();

  expect(observer.session.mock.calls).toEqual([
    [expect.objectContaining({ status: "signed-in" })],
  ]);
  expect(observer.invalidate.mock.calls).toEqual([]);
});

test("the user id is the subject, the actor makes the session impersonated, and the default user is a snapshot of the profile", async () => {
  const { fake, anchor } = create();

  fake.signIn("user_ada", { organization: "org_acme", actor: "user_support" });
  await anchor.start();

  const session = getSignedInSession(anchor.session.get());

  expect(session.principal).toEqual({
    authority: "https://clerk.example.com",
    subject: "user_ada",
    tenant: null,
  });
  expect(session.guest).toBe(false);
  expect(session.impersonated).toBe(true);
  expect(session.user).toEqual({
    id: "user_ada",
    externalId: null,
    username: "user_ada",
    firstName: "USER_ADA",
    lastName: null,
    fullName: "USER_ADA",
    imageUrl: "https://img.clerk.com/user_ada",
    primaryEmailAddress: "user_ada@example.com",
    primaryPhoneNumber: null,
  });
});

test("another organization, a new Clerk session or an impersonation of the same user is a new session, and the same state keeps the key", async () => {
  const { fake, anchor } = create();

  fake.signIn("user_ada", { organization: "org_acme" });
  await anchor.start();

  const acme = getSignedInSession(anchor.session.get());

  fake.setActiveOrganization("org_globex");

  const globex = getSignedInSession(anchor.session.get());

  fake.signIn("user_ada", { organization: "org_globex" });

  const relogged = getSignedInSession(anchor.session.get());

  fake.signIn("user_ada", {
    organization: "org_globex",
    actor: "user_support",
  });

  const impersonated = getSignedInSession(anchor.session.get());

  fake.setActiveOrganization("org_globex");

  expect(
    new Set([acme.key, globex.key, relogged.key, impersonated.key]).size,
  ).toBe(4);
  expect(getSignedInSession(anchor.session.get()).key).toBe(impersonated.key);
});

test("a pending session is action-required with its task, and completing the task keeps its key", async () => {
  const { fake, anchor } = create();

  fake.signIn("user_ada", { task: "setup-mfa" });
  await anchor.start();

  const state = anchor.session.get();

  if (state.status !== "action-required") {
    throw new Error(`Expected an action, got ${state.status}.`);
  }

  expect(state.action).toEqual({ kind: "setup-mfa" });
  await expect(state.session.getToken("api")).rejects.toMatchObject({
    code: "ACTION_REQUIRED",
  });

  fake.completeTask();

  expect(getSignedInSession(anchor.session.get()).key).toBe(state.session.key);
});

test("a mapper receives the Clerk user and its result is the session's user", async () => {
  const fake = createFakeClerk();

  const anchor = new Anchor({
    adapter: clerk({
      sdk: fake.sdk,
      user: (user) => ({ id: user.id, email: user.primaryEmailAddress }),
    }),
  });

  fake.signIn("user_ada");
  await anchor.start();

  expect(getSignedInSession(anchor.session.get()).user).toEqual({
    id: "user_ada",
    email: { emailAddress: "user_ada@example.com" },
  });
});

test("a mapper that throws never fails Clerk's own sign-in, and the session is read instead", async () => {
  const fake = createFakeClerk();

  const anchor = new Anchor({
    adapter: clerk({
      sdk: fake.sdk,
      user: (user) => {
        if (user.id === "user_grace") {
          throw new Error("The mapper cannot map grace.");
        }

        return { id: user.id };
      },
    }),
  });

  const events: AnchorDiagnosticType[] = [];

  anchor.diagnostics.events.subscribe(({ type }) => events.push(type));
  fake.signIn("user_ada");
  await anchor.start();

  expect(() => fake.signIn("user_grace")).not.toThrow();
  await expect.poll(() => events.includes("read failed")).toBe(true);
  expect(getSignedInSession(anchor.session.get()).user).toEqual({
    id: "user_ada",
  });
});

test("each profile mints its token from the session, from Clerk's cache unless forced", async () => {
  const { fake, anchor } = create();

  fake.signIn("user_ada");
  await anchor.start();

  const session = getSignedInSession(anchor.session.get());

  await expect(session.getToken("api")).resolves.toEqual({
    value: "session.user_ada.1",
    kind: "session-token",
    scheme: "Bearer",
  });
  await expect(
    session.getToken("supabase", { forceRefresh: true }),
  ).resolves.toEqual({
    value: "supabase.user_ada.2",
    kind: "session-token",
    scheme: "Bearer",
  });
  expect(fake.tokens).toEqual([
    { skipCache: false, session: "sess_1" },
    { skipCache: true, template: "supabase", session: "sess_1" },
  ]);
});

test("a token asked for a session Clerk no longer holds is refused before Clerk is asked", async () => {
  const { fake, anchor } = create();

  fake.signIn("user_ada");
  await anchor.start();

  const ada = getSignedInSession(anchor.session.get());

  fake.switchSilently("user_grace");

  await expect(ada.getToken("api")).rejects.toMatchObject({
    code: "SESSION_CHANGED",
  });
  expect(fake.tokens).toEqual([]);
});

test("a failure Clerk throws while minting is TOKEN_FAILED with it as its cause", async () => {
  const { fake, anchor } = create();
  const failure = new Error("Network request failed while offline.");

  fake.signIn("user_ada");
  await anchor.start();
  fake.failures.token = failure;

  await expect(
    getSignedInSession(anchor.session.get()).getToken("api"),
  ).rejects.toMatchObject({ code: "TOKEN_FAILED", cause: failure });
});

test("ending signs out exactly this session without navigating, and the state is signed-out at once", async () => {
  const { fake, anchor } = create();

  fake.signIn("user_ada");
  await anchor.start();

  await expect(getSignedInSession(anchor.session.get()).end()).resolves.toEqual(
    { local: "completed", remote: "completed", navigation: null },
  );
  expect(fake.signOuts).toEqual([{ sessionId: "sess_1" }]);
  expect(anchor.session.get()).toEqual({ status: "signed-out" });
});

test("ending a session Clerk no longer holds signs nobody out", async () => {
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
  expect(fake.signOuts).toEqual([]);
  expect(fake.sdk.session?.user.id).toBe("user_grace");
});

test("an offline sign-out clerk-js answered anyway ends the session here and leaves Clerk's side unknown", async () => {
  const { fake, anchor } = create();

  fake.signIn("user_ada");
  await anchor.start();
  fake.failures.offline = true;

  await expect(getSignedInSession(anchor.session.get()).end()).resolves.toEqual(
    { local: "completed", remote: "unknown", navigation: null },
  );
  expect(anchor.session.get()).toEqual({ status: "signed-out" });
});

test("a sign-out Clerk fails rejects with END_FAILED and the error as its cause", async () => {
  const { fake, anchor } = create();
  const failure = new Error("Clerk: Network error.");

  fake.signIn("user_ada");
  await anchor.start();
  fake.failures.removal = failure;

  await expect(
    getSignedInSession(anchor.session.get()).end(),
  ).rejects.toMatchObject({ code: "END_FAILED", cause: failure });
});

test("dispose removes exactly the listener the adapter added, and the application's own keeps being called", async () => {
  const { fake, anchor } = create();
  const heard: Array<string | null> = [];

  fake.sdk.addListener(({ session }) => {
    heard.push(session?.user.id ?? null);
  });
  await anchor.start();

  expect(fake.listeners()).toBe(2);

  anchor.dispose();

  expect(fake.listeners()).toBe(1);

  fake.signIn("user_ada");

  expect(heard).toEqual([null, "user_ada"]);
});
