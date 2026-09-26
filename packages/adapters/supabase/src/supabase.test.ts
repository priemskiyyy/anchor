import { Anchor } from "@priemskiyyy/anchor";
import type { AnchorSession, SessionState } from "@priemskiyyy/anchor";
import { expect, test, vi } from "vitest";

import { accessToken } from "src/accessToken";
import { createFakeSupabase } from "src/fakeSupabase.fixture";
import { supabase } from "src/supabase";

const create = () => {
  const fake = createFakeSupabase();

  const anchor = new Anchor({
    adapter: supabase({ sdk: fake.sdk, tokens: { api: accessToken() } }),
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

test("creating the adapter reads, subscribes to and calls nothing on the client", () => {
  const fake = createFakeSupabase();
  const touched: PropertyKey[] = [];

  const auth = new Proxy(fake.sdk.auth, {
    get: (target, key, receiver) => {
      touched.push(key);

      return Reflect.get(target, key, receiver);
    },
  });

  const sdk = { auth };
  const adapter = supabase({ sdk });

  expect(touched).toEqual([]);
  expect(adapter.native).toBe(sdk);
  expect(adapter.name).toBe("supabase");
});

test("a Supabase session is a session of the user's id, whose user is a copy of the Supabase user", async () => {
  const { fake, anchor } = create();

  fake.signIn("ada");
  await anchor.start();

  const session = getSignedInSession(anchor.session.get());

  expect(session.principal).toEqual({
    authority: "supabase",
    subject: "ada",
    tenant: null,
  });
  expect(session.user).toEqual({
    id: "ada",
    email: "ada@example.com",
    is_anonymous: false,
    aud: "authenticated",
    app_metadata: { provider: "email" },
    user_metadata: { name: "ada" },
  });
  expect(session.user).not.toBe(fake.current()?.user);
  expect(session.guest).toBe(false);
});

test("an anonymous user is a guest session", async () => {
  const { fake, anchor } = create();

  fake.signIn("ada", { anonymous: true });
  await anchor.start();

  expect(getSignedInSession(anchor.session.get()).guest).toBe(true);
});

test("each auth event reaches the session: a refresh keeps it untouched, a profile update keeps its key, another user replaces it", async () => {
  const { fake, anchor } = create();

  fake.signIn("ada");
  await anchor.start();

  const first = anchor.session.get();
  const listener = vi.fn();

  anchor.session.subscribe(listener);
  fake.refresh();

  expect(anchor.session.get()).toBe(first);
  expect(listener).not.toHaveBeenCalled();

  fake.rename("Ada Lovelace");

  const renamed = getSignedInSession(anchor.session.get());

  expect(renamed.key).toBe(getSignedInSession(first).key);
  expect(renamed.user).toMatchObject({
    user_metadata: { name: "Ada Lovelace" },
  });

  fake.signIn("grace");

  expect(getSignedInSession(anchor.session.get()).key).not.toBe(renamed.key);

  await fake.sdk.auth.signOut({ scope: "local" });

  expect(anchor.session.get()).toEqual({ status: "signed-out" });
});

test("a mapper receives the Supabase user and its result is the session's user", async () => {
  const fake = createFakeSupabase();

  const anchor = new Anchor({
    adapter: supabase({
      sdk: fake.sdk,
      user: (user) => ({ id: user.id, name: user.user_metadata.name }),
    }),
  });

  fake.signIn("ada");
  await anchor.start();

  expect(getSignedInSession(anchor.session.get()).user).toEqual({
    id: "ada",
    name: "ada",
  });
});

test("a profile mints the session's access token with its token type as the scheme, and a forced one refreshes the session first", async () => {
  const { fake, anchor } = create();

  fake.signIn("ada");
  await anchor.start();

  const session = getSignedInSession(anchor.session.get());

  await expect(session.getToken("api")).resolves.toEqual({
    value: "access.ada.1",
    kind: "access-token",
    scheme: "bearer",
  });
  await expect(
    session.getToken("api", { forceRefresh: true }),
  ).resolves.toMatchObject({
    value: "access.ada.2",
  });
  expect(fake.refreshes).toEqual(["ada"]);
});

test("a token asked for a session Supabase no longer holds is refused, and a forced one never refreshes the other user's session", async () => {
  const { fake, anchor } = create();

  fake.signIn("ada");
  await anchor.start();

  const ada = getSignedInSession(anchor.session.get());

  fake.switchSilently("grace");

  await expect(ada.getToken("api")).rejects.toMatchObject({
    code: "SESSION_CHANGED",
  });
  await expect(
    ada.getToken("api", { forceRefresh: true }),
  ).rejects.toMatchObject({
    code: "SESSION_CHANGED",
  });
  expect(fake.refreshes).toEqual([]);
});

test("a session Supabase cannot read is TOKEN_FAILED with the Supabase error as its cause", async () => {
  const { fake, anchor } = create();

  fake.signIn("ada");
  await anchor.start();

  const failure = {
    name: "AuthRetryableFetchError",
    message: "fetch failed",
    status: 0,
  };

  fake.failures.read = failure;

  await expect(
    getSignedInSession(anchor.session.get()).getToken("api"),
  ).rejects.toMatchObject({
    code: "TOKEN_FAILED",
    cause: failure,
  });
});

test("ending signs out with the local scope, never Supabase's global default, and the session is signed out", async () => {
  const { fake, anchor } = create();

  fake.signIn("ada");
  await anchor.start();

  await expect(getSignedInSession(anchor.session.get()).end()).resolves.toEqual(
    {
      local: "completed",
      remote: "completed",
      navigation: null,
    },
  );
  expect(fake.signOuts).toEqual([{ scope: "local" }]);
  expect(anchor.session.get()).toEqual({ status: "signed-out" });
});

test("ending a session Supabase no longer holds signs nobody out", async () => {
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
});

test("a sign-out Supabase answers with an error rejects END_FAILED and leaves the session signed in", async () => {
  const { fake, anchor } = create();

  fake.signIn("ada");
  await anchor.start();

  const failure = {
    name: "AuthRetryableFetchError",
    message: "fetch failed",
    status: 0,
  };

  fake.failures.signOut = failure;

  await expect(
    getSignedInSession(anchor.session.get()).end(),
  ).rejects.toMatchObject({
    code: "END_FAILED",
    cause: failure,
  });
  expect(anchor.session.get().status).toBe("signed-in");
});

test("a first read Supabase answers with an error is unavailable, never signed out, though INITIAL_SESSION says null", async () => {
  const { fake, anchor } = create();

  fake.failures.read = {
    name: "AuthRetryableFetchError",
    message: "fetch failed",
    status: 0,
  };
  fake.signIn("ada");

  await anchor.start();

  expect(anchor.session.get()).toMatchObject({
    status: "unavailable",
    error: { code: "READ_FAILED" },
  });
});

test("dispose unsubscribes from onAuthStateChange", async () => {
  const { fake, anchor } = create();

  await anchor.start();

  expect(fake.listeners.size).toBe(1);

  anchor.dispose();

  expect(fake.listeners.size).toBe(0);
});
