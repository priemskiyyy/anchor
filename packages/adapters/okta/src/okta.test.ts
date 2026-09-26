import { Anchor } from "@priemskiyyy/anchor";
import type {
  AnchorDiagnosticType,
  AnchorSession,
  SessionState,
} from "@priemskiyyy/anchor";
import { expect, test } from "vitest";

import { accessToken } from "src/accessToken";
import {
  LOGOUT_URL,
  OKTA_ISSUER,
  createFakeOktaAuth,
} from "src/fakeOktaAuth.fixture";
import { okta } from "src/okta";

const create = (options: Parameters<typeof createFakeOktaAuth>[0] = {}) => {
  const fake = createFakeOktaAuth(options);

  const anchor = new Anchor({
    adapter: okta({ sdk: fake.sdk, tokens: { api: accessToken() } }),
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

test("creating the adapter reads, subscribes to and calls nothing on OktaAuth", () => {
  const fake = createFakeOktaAuth();
  const touched: PropertyKey[] = [];

  const sdk = new Proxy(fake.sdk, {
    get: (target, key, receiver) => {
      touched.push(key);

      return Reflect.get(target, key, receiver);
    },
  });

  const adapter = okta({ sdk });

  expect(touched).toEqual([]);
  expect(adapter.native).toBe(sdk);
  expect(adapter.name).toBe("okta");
  expect(adapter.tokens).toEqual({});
  expect(fake.listeners()).toBe(0);
});

test("a read answers the auth state okta-auth-js computes: its ID token is a session of the issuer and subject, whose user is a snapshot of the profile claims", async () => {
  const { fake, anchor } = create();

  await fake.signIn("ada");
  await anchor.start();

  const session = getSignedInSession(anchor.session.get());

  expect(session.principal).toEqual({
    authority: OKTA_ISSUER,
    subject: "ada",
    tenant: null,
  });
  expect(session.user).toEqual({
    sub: "ada",
    name: "ADA",
    preferred_username: "ada@example.com",
    given_name: null,
    family_name: null,
    email: "ada@example.com",
    email_verified: true,
  });
  expect(session.guest).toBe(false);
  expect(session.impersonated).toBe(false);
});

test("an auth state Okta does not count as authenticated is signed out", async () => {
  const { anchor } = create();

  await anchor.start();

  expect(anchor.session.get()).toEqual({ status: "signed-out" });
});

test("every auth state change is pushed: a sign-in, another user and a sign-out, without a read", async () => {
  const { fake, anchor, events } = create();

  await anchor.start();

  const reads = events.filter((type) => type === "read started").length;

  await fake.signIn("ada");

  const ada = getSignedInSession(anchor.session.get());

  await fake.signIn("grace");

  expect(getSignedInSession(anchor.session.get()).key).not.toBe(ada.key);

  fake.sdk.tokenManager.clear();

  await expect.poll(() => anchor.session.get().status).toBe("signed-out");
  expect(events.filter((type) => type === "read started").length).toBe(reads);
});

test("the same subject in another Okta session is a new session, and the same session keeps the key", async () => {
  const { fake, anchor } = create();

  await fake.signIn("ada", { sid: "sid_a" });
  await anchor.start();

  const first = getSignedInSession(anchor.session.get());

  await fake.signIn("ada", { sid: "sid_a" });

  expect(getSignedInSession(anchor.session.get()).key).toBe(first.key);

  await fake.signIn("ada", { sid: "sid_b" });

  expect(getSignedInSession(anchor.session.get()).key).not.toBe(first.key);
});

test("a mapper receives the ID token claims and its result is the session's user", async () => {
  const fake = createFakeOktaAuth();

  const anchor = new Anchor({
    adapter: okta({
      sdk: fake.sdk,
      user: (claims) => ({ id: claims.sub, email: claims.email }),
    }),
  });

  await fake.signIn("ada");
  await anchor.start();

  expect(getSignedInSession(anchor.session.get()).user).toEqual({
    id: "ada",
    email: "ada@example.com",
  });
});

test("a mapper that throws never breaks the auth state manager's update, and the session is read instead", async () => {
  const fake = createFakeOktaAuth();

  const anchor = new Anchor({
    adapter: okta({
      sdk: fake.sdk,
      user: (claims) => {
        if (claims.sub === "grace") {
          throw new Error("The mapper cannot map grace.");
        }

        return { id: claims.sub };
      },
    }),
  });

  const events: AnchorDiagnosticType[] = [];

  anchor.diagnostics.events.subscribe(({ type }) => events.push(type));

  await fake.signIn("ada");
  await anchor.start();

  await expect(fake.signIn("grace")).resolves.toMatchObject({
    isAuthenticated: true,
  });
  await expect.poll(() => events.includes("read failed")).toBe(true);
  expect(getSignedInSession(anchor.session.get()).user).toEqual({ id: "ada" });
});

test("an auth state that carries a transform error is no evidence: the first state is unavailable, never signed out", async () => {
  const { fake, anchor } = create();
  const failure = new Error("transformAuthState failed");

  await fake.signIn("ada");
  fake.failures.transform = failure;
  await anchor.start();

  expect(anchor.session.get()).toMatchObject({
    status: "unavailable",
    error: { code: "READ_FAILED", cause: failure },
  });
});

test("a pushed auth state that carries a transform error asks for a read and leaves the session as it was", async () => {
  const { fake, anchor, events } = create();

  await fake.signIn("ada");
  await anchor.start();

  const ada = getSignedInSession(anchor.session.get());

  fake.failures.transform = new Error("transformAuthState failed");
  fake.sdk.tokenManager.clear();

  await expect.poll(() => events.includes("read failed")).toBe(true);
  expect(getSignedInSession(anchor.session.get()).key).toBe(ada.key);
});

test("a profile mints the stored access token with its token type as the scheme, renewing through the token manager when it has expired or is forced", async () => {
  const { fake, anchor } = create();

  await fake.signIn("ada");
  await anchor.start();

  const session = getSignedInSession(anchor.session.get());

  await expect(session.getToken("api")).resolves.toEqual({
    value: "access.ada.1",
    kind: "access-token",
    scheme: "Bearer",
  });
  expect(fake.renewals).toEqual([]);

  fake.expire();

  await expect(session.getToken("api")).resolves.toMatchObject({
    value: "access.ada.2",
  });
  await expect(
    session.getToken("api", { forceRefresh: true }),
  ).resolves.toMatchObject({ value: "access.ada.3" });
  expect(fake.renewals).toEqual(["accessToken", "accessToken"]);
  expect(getSignedInSession(anchor.session.get()).key).toBe(session.key);
});

test("a token asked for a session okta-auth-js no longer holds is refused before anything renews", async () => {
  const { fake, anchor } = create();

  await fake.signIn("ada");
  await anchor.start();

  const ada = getSignedInSession(anchor.session.get());

  fake.switchSilently("grace");

  await expect(
    ada.getToken("api", { forceRefresh: true }),
  ).rejects.toMatchObject({ code: "SESSION_CHANGED" });
  expect(fake.renewals).toEqual([]);
});

test("a silent renewal that fails with login_required, with no refresh token to fall back on, removes the access token first, so the session is signed out and its token rejects with SESSION_CHANGED", async () => {
  const { fake, anchor } = create();

  await fake.signIn("ada", { withRefreshToken: false });
  await anchor.start();

  fake.failures.renew = Object.assign(new Error("The user is not logged in."), {
    name: "OAuthError",
    errorCode: "login_required",
  });

  await expect(
    getSignedInSession(anchor.session.get()).getToken("api", {
      forceRefresh: true,
    }),
  ).rejects.toMatchObject({ code: "SESSION_CHANGED" });
  expect(anchor.session.get()).toEqual({ status: "signed-out" });
  expect(fake.tokens().accessToken).toBe(undefined);
});

test("a renewal that fails on the network keeps the refresh token, so the session stays signed in and only its token fails", async () => {
  const { fake, anchor } = create();

  await fake.signIn("ada");
  await anchor.start();

  const failure = new TypeError("fetch failed");

  fake.failures.renew = failure;

  await expect(
    getSignedInSession(anchor.session.get()).getToken("api", {
      forceRefresh: true,
    }),
  ).rejects.toMatchObject({ code: "TOKEN_FAILED", cause: failure });
  await expect.poll(() => fake.tokens().accessToken).toBe(undefined);
  await expect(anchor.sync()).rejects.toMatchObject({ code: "READ_FAILED" });

  expect(fake.tokens().refreshToken).toEqual({ refreshToken: "refresh.ada.1" });
  expect(getSignedInSession(anchor.session.get()).principal.subject).toBe(
    "ada",
  );
});

test("ending revokes the refresh token, then the access token, clears the token manager and hands back Okta's sign-out page", async () => {
  const { fake, anchor } = create({
    postLogoutRedirectUri: "https://app.example.com/goodbye",
  });

  await fake.signIn("ada");
  await anchor.start();

  await expect(getSignedInSession(anchor.session.get()).end()).resolves.toEqual(
    {
      local: "completed",
      remote: "unknown",
      navigation: {
        url: `${LOGOUT_URL}?id_token_hint=id.ada.1&post_logout_redirect_uri=https%3A%2F%2Fapp.example.com%2Fgoodbye`,
      },
    },
  );
  expect(fake.revocations).toEqual([
    "refresh refresh.ada.1",
    "access access.ada.1",
  ]);
  expect(fake.tokens()).toEqual({});
  expect(anchor.session.get()).toEqual({ status: "signed-out" });
});

test("a session without a refresh token revokes only its access token", async () => {
  const { fake, anchor } = create();

  await fake.signIn("ada", { withRefreshToken: false });
  await anchor.start();

  await getSignedInSession(anchor.session.get()).end();

  expect(fake.revocations).toEqual(["access access.ada.1"]);
  expect(fake.tokens()).toEqual({});
});

test("a revocation that fails ends nothing: END_FAILED, and the tokens stay", async () => {
  const { fake, anchor } = create();

  await fake.signIn("ada");
  await anchor.start();

  const failure = new TypeError("fetch failed");

  fake.failures.revoke = failure;

  await expect(
    getSignedInSession(anchor.session.get()).end(),
  ).rejects.toMatchObject({ code: "END_FAILED", cause: failure });
  expect(fake.tokens().idToken?.claims.sub).toBe("ada");
  expect(getSubject(anchor.session.get())).toBe("ada");
});

test("an okta-auth-js without getSignOutRedirectUrl still ends locally, with no page and an unknown remote session", async () => {
  const { fake, anchor } = create({ signOutRedirectUrl: false });

  await fake.signIn("ada");
  await anchor.start();

  await expect(getSignedInSession(anchor.session.get()).end()).resolves.toEqual(
    { local: "completed", remote: "unknown", navigation: null },
  );
  expect(fake.tokens()).toEqual({});
});

test("ending a session okta-auth-js no longer holds revokes and clears nothing", async () => {
  const { fake, anchor } = create();

  await fake.signIn("ada");
  await anchor.start();

  const ada = getSignedInSession(anchor.session.get());

  fake.switchSilently("grace");

  await expect(ada.end()).resolves.toEqual({
    local: "not-applicable",
    remote: "not-applicable",
    navigation: null,
  });
  expect(fake.revocations).toEqual([]);
  expect(fake.tokens().idToken?.claims.sub).toBe("grace");
});

test("a session okta-auth-js replaced while its tokens were revoked is not cleared", async () => {
  const { fake, anchor } = create();

  await fake.signIn("ada");
  await anchor.start();

  const revokeAccessToken = fake.sdk.revokeAccessToken;

  fake.sdk.revokeAccessToken = async (token) => {
    fake.switchSilently("grace");

    return revokeAccessToken(token);
  };

  await expect(getSignedInSession(anchor.session.get()).end()).resolves.toEqual(
    { local: "not-applicable", remote: "unknown", navigation: null },
  );
  expect(fake.tokens().idToken?.claims.sub).toBe("grace");
});

test.each([
  ["an issuer", { sub: "ada" }],
  ["a subject", { iss: OKTA_ISSUER }],
])(
  "an ID token without %s is outside the contract, so the first state is unavailable",
  async (_missing, claims) => {
    const fake = createFakeOktaAuth();

    const sdk = {
      ...fake.sdk,
      authStateManager: {
        ...fake.sdk.authStateManager,
        updateAuthState: async () => ({
          isAuthenticated: true,
          idToken: { idToken: "id", claims },
        }),
      },
    };

    const anchor = new Anchor({ adapter: okta({ sdk }) });

    await anchor.start();

    expect(anchor.session.get()).toMatchObject({
      status: "unavailable",
      error: { code: "INVALID_ANSWER" },
    });
  },
);

test("an authenticated auth state without an ID token cannot be named, so the first state is unavailable", async () => {
  const fake = createFakeOktaAuth();

  const sdk = {
    ...fake.sdk,
    authStateManager: {
      ...fake.sdk.authStateManager,
      updateAuthState: async () => ({ isAuthenticated: true }),
    },
  };

  const anchor = new Anchor({ adapter: okta({ sdk }) });

  await anchor.start();

  expect(anchor.session.get()).toMatchObject({
    status: "unavailable",
    error: { code: "READ_FAILED", cause: expect.any(TypeError) },
  });
});

test("dispose unsubscribes exactly its own handler, and the application's own keeps hearing the auth state", async () => {
  const { fake, anchor } = create();
  const heard: unknown[] = [];

  fake.sdk.authStateManager.subscribe((authState) => {
    heard.push(authState.isAuthenticated);
  });

  await anchor.start();

  expect(fake.listeners()).toBe(2);

  anchor.dispose();

  expect(fake.listeners()).toBe(1);

  await fake.signIn("ada");

  expect(heard).toEqual([false, true]);
});
