import { Anchor } from "@priemskiyyy/anchor";
import type { AnchorSession, SessionState } from "@priemskiyyy/anchor";
import { afterEach, expect, test, vi } from "vitest";

import { betterAuth } from "src/betterAuth";
import { sessionToken } from "src/sessionToken";
import { createFakeBetterAuthClient } from "src/fakeBetterAuthClient.fixture";
import { END_REFRESH_BUDGET } from "src/utils/constants/betterAuth";

const create = ({
  expo,
  confirmation,
}: { expo?: boolean; confirmation?: { timeout: number } } = {}) => {
  const fake = createFakeBetterAuthClient({ expo });

  const anchor = new Anchor({
    adapter: betterAuth({
      sdk: fake.sdk,
      ...(confirmation === undefined ? {} : { confirmation }),
    }),
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

// A macrotask runs after every microtask the fake's atom queued.
const settle = () =>
  new Promise((resolve) => {
    setTimeout(resolve, 0);
  });

const getSubject = <TUser, TProfile extends string>(
  state: SessionState<TUser, TProfile>,
) => (state.status === "signed-in" ? state.session.principal.subject : null);

afterEach(() => {
  vi.useRealTimers();
});

test("creating the adapter reads and calls nothing on the client", () => {
  const fake = createFakeBetterAuthClient();
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
  expect(adapter.name).toBe("better-auth");
  expect(adapter.tokens).toEqual({});
});

test("the session atom's settled values reach the session: a sign-in and a sign-out through the client", async () => {
  const { fake, anchor } = create();

  await anchor.start();

  expect(anchor.session.get()).toEqual({ status: "signed-out" });

  fake.signIn("user_ada");

  await expect.poll(() => getSubject(anchor.session.get())).toBe("user_ada");

  await fake.sdk.signOut();

  await expect
    .poll(() => anchor.session.get())
    .toEqual({ status: "signed-out" });
});

test("the atom's first value, pending before any fetch, is never taken for a sign-out", async () => {
  const { fake, anchor } = create();
  const statuses: string[] = [];

  anchor.session.subscribe(() => statuses.push(anchor.session.get().status));
  fake.signIn("user_ada");
  await anchor.start();
  await settle();

  expect(statuses).toEqual(["signed-in"]);
});

test("a read is the atom's own fetch, so a sync sees a change the client was not told of, and the atom agrees", async () => {
  const { fake, anchor } = create();

  fake.signIn("user_ada");
  await anchor.start();
  fake.switchSilently("user_grace");
  await anchor.sync();

  expect(getSubject(anchor.session.get())).toBe("user_grace");
  expect(fake.value().data?.user.id).toBe("user_grace");
});

test("a read waits for the fetch that replaced its own", async () => {
  const { fake, anchor } = create();

  fake.signIn("user_ada");
  await anchor.start();
  fake.holdFetches();

  let isSynced = false;

  const synced = anchor.sync().then(() => {
    isSynced = true;
  });

  await settle();
  fake.switchSilently("user_grace");
  fake.refetch();
  await settle();

  expect(isSynced).toBe(false);

  fake.settleFetches();
  await synced;

  expect(getSubject(anchor.session.get())).toBe("user_grace");
});

test("a read whose fetch outlives the timeout stops waiting and leaves only the adapter's own listener", async () => {
  vi.useFakeTimers();

  const fake = createFakeBetterAuthClient();

  const anchor = new Anchor({
    adapter: betterAuth({ sdk: fake.sdk }),
    timeout: 1_000,
  });

  fake.holdFetches();

  const started = anchor.start();

  await vi.advanceTimersByTimeAsync(1_000);
  await started;

  expect(anchor.session.get()).toMatchObject({
    status: "unavailable",
    error: { code: "TIMEOUT" },
  });
  expect(fake.listeners.size).toBe(1);
});

test("a failed fetch keeps the atom's data and says nothing, so the session stays", async () => {
  const { fake, anchor } = create();

  fake.signIn("user_ada");
  await anchor.start();

  const ada = getSignedInSession(anchor.session.get());

  fake.failures.fetch = { status: 500, statusText: "Internal Server Error" };
  fake.refetch();
  await settle();

  expect(anchor.session.get()).toEqual({ status: "signed-in", session: ada });
});

test("a 401, which Better Auth answers after deleting the session cookie, signs the session out through the atom and through a read", async () => {
  const { fake, anchor } = create();

  fake.signIn("user_ada");
  await anchor.start();

  fake.failures.fetch = { status: 401, statusText: "Unauthorized" };
  fake.refetch();
  await settle();

  expect(anchor.session.get()).toEqual({ status: "signed-out" });

  const restarted = create();

  restarted.fake.signIn("user_ada");
  restarted.fake.failures.fetch = { status: 401, statusText: "Unauthorized" };
  await restarted.anchor.start();

  expect(restarted.anchor.session.get()).toEqual({ status: "signed-out" });
});

test("a read that cannot reach the server with nothing held is no evidence of signing out: the first state is unavailable", async () => {
  const { fake, anchor } = create();
  const failure = new TypeError("Network request failed");

  fake.failures.network = failure;
  await anchor.start();

  expect(anchor.session.get()).toMatchObject({
    status: "unavailable",
    error: { code: "READ_FAILED", cause: failure },
  });
});

test("on React Native, an offline start answers the session Better Auth's Expo plugin restored from its cache", async () => {
  const { fake, anchor } = create({ expo: true });

  fake.cacheSession("user_ada");
  fake.failures.network = new TypeError("Network request failed");
  await anchor.start();

  expect(getSubject(anchor.session.get())).toBe("user_ada");
  expect(fake.value()).toMatchObject({
    data: { user: { id: "user_ada" } },
    isPending: false,
    isRefetching: false,
  });
});

test("on React Native, an online start waits for the server, so a cached session the server ended is never shown", async () => {
  const { fake, anchor } = create({ expo: true });
  const statuses: string[] = [];

  anchor.session.subscribe(() => statuses.push(anchor.session.get().status));
  fake.cacheSession("user_ada");
  fake.endOnServer();
  await anchor.start();
  await settle();

  expect(statuses).toEqual(["signed-out"]);
});

test("with a confirmation timeout, a restored session the server has not confirmed in time is answered at the timeout, and not before", async () => {
  vi.useFakeTimers();

  const { fake, anchor } = create({
    expo: true,
    confirmation: { timeout: 1_500 },
  });

  fake.cacheSession("user_ada");
  fake.holdFetches();
  anchor.start().catch(() => {});

  await vi.advanceTimersByTimeAsync(1_499);
  expect(anchor.session.get().status).toBe("initializing");

  await vi.advanceTimersByTimeAsync(1);
  expect(getSubject(anchor.session.get())).toBe("user_ada");
});

test("with a confirmation timeout, the server's answer after the timeout replaces the unconfirmed session", async () => {
  vi.useFakeTimers();

  const { fake, anchor } = create({
    expo: true,
    confirmation: { timeout: 1_500 },
  });

  fake.cacheSession("user_ada");
  fake.holdFetches();
  anchor.start().catch(() => {});
  await vi.advanceTimersByTimeAsync(1_500);
  fake.endOnServer();
  fake.settleFetches();
  await vi.advanceTimersByTimeAsync(0);

  expect(anchor.session.get()).toEqual({ status: "signed-out" });
});

test("with a confirmation timeout, a restored session the server ended in time is never shown", async () => {
  const { fake, anchor } = create({
    expo: true,
    confirmation: { timeout: 1_500 },
  });

  const statuses: string[] = [];

  anchor.session.subscribe(() => statuses.push(anchor.session.get().status));
  fake.cacheSession("user_ada");
  fake.endOnServer();
  await anchor.start();
  await settle();

  expect(statuses).toEqual(["signed-out"]);
});

test("with a confirmation timeout of zero, a restored session is answered without waiting for the server", async () => {
  const { fake, anchor } = create({ expo: true, confirmation: { timeout: 0 } });

  fake.cacheSession("user_ada");
  fake.holdFetches();
  anchor.start().catch(() => {});

  await expect.poll(() => getSubject(anchor.session.get())).toBe("user_ada");
});

test("on React Native, an online start with a cached session the server still holds is signed in as it", async () => {
  const { fake, anchor } = create({ expo: true });

  fake.cacheSession("user_ada");
  await anchor.start();

  expect(getSubject(anchor.session.get())).toBe("user_ada");
});

test("the user id is the subject, and the organization, the team and the Better Auth session are the context", async () => {
  const { fake, anchor } = create();

  fake.signIn("user_ada", {
    organization: "org_acme",
    team: "team_red",
    impersonatedBy: "user_admin",
  });
  await anchor.start();

  const session = getSignedInSession(anchor.session.get());

  expect(session.principal).toEqual({
    authority: "better-auth",
    subject: "user_ada",
    tenant: null,
  });
  expect(session.guest).toBe(false);
  expect(session.impersonated).toBe(true);
  expect(session.user).toEqual({
    id: "user_ada",
    name: "USER_ADA",
    email: "user_ada@example.com",
    emailVerified: true,
    image: null,
  });
});

test("an anonymous user is a guest", async () => {
  const { fake, anchor } = create();

  fake.signIn("user_anonymous", { anonymous: true });
  await anchor.start();

  expect(getSignedInSession(anchor.session.get()).guest).toBe(true);
});

test("another active organization, or a new Better Auth session of the same user, is a new session", async () => {
  const { fake, anchor } = create();

  fake.signIn("user_ada", { organization: "org_acme" });
  await anchor.start();

  const acme = getSignedInSession(anchor.session.get());

  fake.setActiveOrganization("org_globex");
  await expect
    .poll(() => getSignedInSession(anchor.session.get()).key)
    .not.toBe(acme.key);

  const globex = getSignedInSession(anchor.session.get());

  fake.signIn("user_ada", { organization: "org_globex" });
  await expect
    .poll(() => getSignedInSession(anchor.session.get()).key)
    .not.toBe(globex.key);
});

test("a user update keeps the session's key and updates its user", async () => {
  const { fake, anchor } = create();

  fake.signIn("user_ada");
  await anchor.start();

  const ada = getSignedInSession(anchor.session.get());

  fake.rename("Ada Lovelace");

  await expect
    .poll(() => getSignedInSession(anchor.session.get()).user.name)
    .toBe("Ada Lovelace");
  expect(getSignedInSession(anchor.session.get()).key).toBe(ada.key);
});

test("a mapper receives the Better Auth user with its plugin fields, and its result is the session's user", async () => {
  const fake = createFakeBetterAuthClient();

  const anchor = new Anchor({
    adapter: betterAuth({
      sdk: fake.sdk,
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

test("ending signs the session out on the server, and the state is signed-out at once", async () => {
  const { fake, anchor } = create();

  fake.signIn("user_ada");
  await anchor.start();

  await expect(getSignedInSession(anchor.session.get()).end()).resolves.toEqual(
    {
      local: "completed",
      remote: "completed",
      navigation: null,
    },
  );
  expect(fake.signOuts()).toBe(1);
  expect(anchor.session.get()).toEqual({ status: "signed-out" });
});

test("ending a session the client no longer holds, once the atom has refreshed, signs nobody out", async () => {
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
  expect(fake.signOuts()).toBe(0);
});

test("ending does not wait for a session fetch that hangs: after the budget it signs out the session the atom holds", async () => {
  vi.useFakeTimers();

  const { fake, anchor } = create();

  fake.signIn("user_ada");
  await anchor.start();

  const ada = getSignedInSession(anchor.session.get());

  fake.holdFetches();

  const ending = ada.end();

  await vi.advanceTimersByTimeAsync(END_REFRESH_BUDGET);

  await expect(ending).resolves.toEqual({
    local: "completed",
    remote: "completed",
    navigation: null,
  });
  expect(fake.signOuts()).toBe(1);
});

test("a sign-out Better Auth answers with an error rejects with END_FAILED, and the session stays", async () => {
  const { fake, anchor } = create();
  const failure = { status: 500, statusText: "Internal Server Error" };

  fake.signIn("user_ada");
  await anchor.start();

  const ada = getSignedInSession(anchor.session.get());

  fake.failures.signOut = failure;

  await expect(ada.end()).rejects.toMatchObject({
    code: "END_FAILED",
    cause: failure,
  });
  expect(getSignedInSession(anchor.session.get()).key).toBe(ada.key);
});

test("in a browser offline, nothing clears the cookie, so ending rejects with END_FAILED and the session stays", async () => {
  const { fake, anchor } = create();
  const failure = new TypeError("Failed to fetch");

  fake.signIn("user_ada");
  await anchor.start();

  const ada = getSignedInSession(anchor.session.get());

  fake.failures.network = failure;
  fake.failures.signOutNetwork = failure;

  await expect(ada.end()).rejects.toMatchObject({
    code: "END_FAILED",
    cause: failure,
  });
  expect(getSignedInSession(anchor.session.get()).key).toBe(ada.key);
});

test("on React Native offline, the Expo plugin clears the stored session before asking the server, so ending completes here and the server's side is unknown", async () => {
  const { fake, anchor } = create({ expo: true });

  fake.signIn("user_ada");
  await anchor.start();

  fake.failures.network = new TypeError("Network request failed");
  fake.failures.signOutNetwork = new TypeError("Network request failed");

  await expect(getSignedInSession(anchor.session.get()).end()).resolves.toEqual(
    {
      local: "completed",
      remote: "unknown",
      navigation: null,
    },
  );
  expect(anchor.session.get()).toEqual({ status: "signed-out" });
});

test("a session token profile mints the session's token for its session, and never for another", async () => {
  const fake = createFakeBetterAuthClient();

  const anchor = new Anchor({
    adapter: betterAuth({ sdk: fake.sdk, tokens: { api: sessionToken() } }),
  });

  fake.signIn("user_ada");
  await anchor.start();

  const ada = getSignedInSession(anchor.session.get());

  await expect(ada.getToken("api")).resolves.toEqual({
    value: "token_1",
    kind: "session-token",
    scheme: "Bearer",
  });

  fake.switchSilently("user_grace");
  await anchor.sync();

  await expect(ada.getToken("api")).rejects.toMatchObject({
    code: "SESSION_CHANGED",
  });
});

test("a new Better Auth session of the same user mints its own token, and the replaced session mints none", async () => {
  const fake = createFakeBetterAuthClient();

  const anchor = new Anchor({
    adapter: betterAuth({ sdk: fake.sdk, tokens: { api: sessionToken() } }),
  });

  fake.signIn("user_ada");
  await anchor.start();

  const first = getSignedInSession(anchor.session.get());

  fake.signIn("user_ada");
  await expect
    .poll(() => getSignedInSession(anchor.session.get()).key)
    .not.toBe(first.key);

  await expect(
    getSignedInSession(anchor.session.get()).getToken("api"),
  ).resolves.toMatchObject({ value: "token_2" });
  await expect(first.getToken("api")).rejects.toMatchObject({
    code: "SESSION_CHANGED",
  });
});

test("a client without a session atom fails to start", async () => {
  const fake = createFakeBetterAuthClient();

  const anchor = new Anchor({
    adapter: betterAuth({ sdk: { ...fake.sdk, $store: { atoms: {} } } }),
  });

  await expect(anchor.start()).rejects.toMatchObject({
    code: "START_FAILED",
    cause: expect.any(TypeError),
  });
});
