import { Anchor } from "@priemskiyyy/anchor";
import type { AnchorSession, SessionState } from "@priemskiyyy/anchor";
import { expect, test } from "vitest";

import { accessToken } from "src/accessToken";
import { auth0 } from "src/auth0";
import {
  AUTH0_DOMAIN,
  AUTH0_ISSUER,
  createFakeAuth0,
} from "src/fakeAuth0.fixture";

const API = "https://api.example.com";

const create = () => {
  const fake = createFakeAuth0();

  const anchor = new Anchor({
    adapter: auth0({
      sdk: fake.sdk,
      domain: AUTH0_DOMAIN,
      parseIdToken: fake.parseIdToken,
      tokens: {
        api: accessToken({ audience: API, scope: "read:projects" }),
        login: accessToken(),
      },
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

const createCredentialsManagerError = (
  type: string,
  code = type,
  message = type,
) => Object.assign(new Error(message), { name: code, code, type });

test("creating the adapter reads and calls nothing on the client", () => {
  const fake = createFakeAuth0();
  const touched: PropertyKey[] = [];

  const sdk = new Proxy(fake.sdk, {
    get: (target, key, receiver) => {
      touched.push(key);

      return Reflect.get(target, key, receiver);
    },
  });

  const adapter = auth0({
    sdk,
    domain: AUTH0_DOMAIN,
    parseIdToken: fake.parseIdToken,
  });

  expect(touched).toEqual([]);
  expect(fake.calls).toEqual([]);
  expect(adapter.native).toBe(sdk);
  expect(adapter.name).toBe("auth0-react-native");
  expect(adapter.tokens).toEqual({});
});

test("the client emits nothing, so a login after the start is seen once the application syncs", async () => {
  const { fake, anchor } = create();

  await anchor.start();

  expect(anchor.session.get()).toEqual({ status: "signed-out" });

  fake.login("auth0|ada");

  expect(anchor.session.get()).toEqual({ status: "signed-out" });

  await anchor.sync();

  expect(getSignedInSession(anchor.session.get()).principal.subject).toBe(
    "auth0|ada",
  );
});

test("the stored ID token names the session: the domain's issuer and the subject, an actor, and the profile fields parseIdToken reads", async () => {
  const { fake, anchor } = create();

  fake.login("auth0|ada", { impersonatedBy: "auth0|support" });
  await anchor.start();

  const session = getSignedInSession(anchor.session.get());

  expect(session.principal).toEqual({
    authority: AUTH0_ISSUER,
    subject: "auth0|ada",
    tenant: null,
  });
  expect(session.impersonated).toBe(true);
  expect(session.guest).toBe(false);
  expect(session.user).toEqual({
    sub: "auth0|ada",
    name: "AUTH0|ADA",
    nickname: "auth0|ada",
    picture: "https://cdn.example.com/auth0|ada.png",
    email: "auth0|ada@example.com",
    emailVerified: true,
  });
});

test("credentials the manager can neither use nor renew are signed out", async () => {
  const { fake, anchor } = create();

  fake.login("auth0|ada", { refreshable: false });
  fake.expire();
  await anchor.start();

  expect(anchor.session.get()).toEqual({ status: "signed-out" });
});

test("credentials cleared between the check and the read are signed out, as the credentials manager says", async () => {
  const { fake, anchor } = create();
  const { hasValidCredentials } = fake.sdk.credentialsManager;

  fake.login("auth0|ada");

  fake.sdk.credentialsManager.hasValidCredentials = async (minTtl) => {
    const valid = await hasValidCredentials(minTtl);

    await fake.sdk.credentialsManager.clearCredentials();

    return valid;
  };

  await anchor.start();

  expect(anchor.session.get()).toEqual({ status: "signed-out" });
});

test("a read whose renewal Auth0 refuses fails, so the first state is unavailable, never signed out", async () => {
  const { fake, anchor } = create();
  const refused = createCredentialsManagerError("RENEW_FAILED");

  fake.login("auth0|ada");
  fake.expire();
  fake.failures.renew = refused;
  await anchor.start();

  expect(anchor.session.get()).toMatchObject({
    status: "unavailable",
    error: { code: "READ_FAILED", cause: refused },
  });
});

test("the same user in another organization is a new session, and the same stored login keeps its key", async () => {
  const { fake, anchor } = create();

  fake.login("auth0|ada", { org: "org_acme" });
  await anchor.start();

  const acme = getSignedInSession(anchor.session.get());

  fake.login("auth0|ada", { org: "org_globex" });
  await anchor.sync();

  const globex = getSignedInSession(anchor.session.get());

  expect(globex.key).not.toBe(acme.key);

  await anchor.sync();

  expect(getSignedInSession(anchor.session.get()).key).toBe(globex.key);
});

test("a new login of the same user in the same organization keeps its key, because parseIdToken leaves out the sid that tells logins apart", async () => {
  const { fake, anchor } = create();

  fake.login("auth0|ada", { org: "org_acme" });
  await anchor.start();

  const first = getSignedInSession(anchor.session.get());

  fake.login("auth0|ada", { org: "org_acme" });
  await anchor.sync();

  expect(getSignedInSession(anchor.session.get()).key).toBe(first.key);
});

test("a mapper receives the user parseIdToken builds and its result is the session's user", async () => {
  const fake = createFakeAuth0();

  const anchor = new Anchor({
    adapter: auth0({
      sdk: fake.sdk,
      domain: AUTH0_DOMAIN,
      parseIdToken: fake.parseIdToken,
      user: (user) => ({ id: user.sub, email: user.email }),
    }),
  });

  fake.login("auth0|ada");
  await anchor.start();

  expect(getSignedInSession(anchor.session.get()).user).toEqual({
    id: "auth0|ada",
    email: "auth0|ada@example.com",
  });
});

test("a profile without an audience answers the login's access token with its token type as the scheme, renewed through getCredentials when forced", async () => {
  const { fake, anchor } = create();

  fake.login("auth0|ada");
  await anchor.start();

  const session = getSignedInSession(anchor.session.get());

  fake.calls.length = 0;

  await expect(session.getToken("login")).resolves.toEqual({
    value: "access.auth0|ada.1",
    kind: "access-token",
    scheme: "DPoP",
  });
  await expect(
    session.getToken("login", { forceRefresh: true }),
  ).resolves.toEqual({
    value: "access.auth0|ada.2",
    kind: "access-token",
    scheme: "DPoP",
  });
  expect(fake.calls).toEqual([
    ["hasValidCredentials", undefined],
    ["getCredentials", undefined, undefined, undefined, undefined],
    ["hasValidCredentials", undefined],
    ["getCredentials", undefined, undefined, undefined, undefined],
    ["getCredentials", undefined, undefined, undefined, true],
  ]);
  expect(getSignedInSession(anchor.session.get()).key).toBe(session.key);
});

test("a profile with an audience mints through getApiCredentials for its audience and scope, forced by clearing that audience's credentials first", async () => {
  const { fake, anchor } = create();

  fake.login("auth0|ada");
  await anchor.start();

  const session = getSignedInSession(anchor.session.get());

  await expect(session.getToken("api")).resolves.toEqual({
    value: `api.auth0|ada.${API}.2`,
    kind: "access-token",
    scheme: "DPoP",
  });
  await expect(session.getToken("api")).resolves.toMatchObject({
    value: `api.auth0|ada.${API}.2`,
  });

  fake.calls.length = 0;

  await expect(
    session.getToken("api", { forceRefresh: true }),
  ).resolves.toMatchObject({ value: `api.auth0|ada.${API}.3` });
  expect(fake.calls).toEqual([
    ["hasValidCredentials", undefined],
    ["getCredentials", undefined, undefined, undefined, undefined],
    ["clearApiCredentials", API, "read:projects"],
    ["getApiCredentials", API, "read:projects"],
    ["hasValidCredentials", undefined],
    ["getCredentials", undefined, undefined, undefined, undefined],
  ]);
});

test("another user's login never inherits the API credentials the last user cached: that audience's cache is cleared before the new user mints", async () => {
  const { fake, anchor } = create();

  fake.login("auth0|ada");
  await anchor.start();

  await expect(
    getSignedInSession(anchor.session.get()).getToken("api"),
  ).resolves.toMatchObject({ value: `api.auth0|ada.${API}.2` });

  fake.login("auth0|grace");
  await anchor.sync();
  fake.calls.length = 0;

  const grace = getSignedInSession(anchor.session.get());

  await expect(grace.getToken("api")).resolves.toMatchObject({
    value: `api.auth0|grace.${API}.4`,
  });
  expect(fake.calls).toContainEqual([
    "clearApiCredentials",
    API,
    "read:projects",
  ]);

  fake.calls.length = 0;

  await expect(grace.getToken("api")).resolves.toMatchObject({
    value: `api.auth0|grace.${API}.4`,
  });
  expect(fake.calls).not.toContainEqual([
    "clearApiCredentials",
    API,
    "read:projects",
  ]);
});

test("API credentials cached before the start name no user, so they are cleared before the first mint of each login", async () => {
  const { fake, anchor } = create();

  fake.login("auth0|ada");
  await fake.sdk.credentialsManager.getApiCredentials(API, "read:projects");
  fake.login("auth0|grace");
  await anchor.start();
  fake.calls.length = 0;

  await expect(
    getSignedInSession(anchor.session.get()).getToken("api"),
  ).resolves.toMatchObject({ value: `api.auth0|grace.${API}.4` });
  expect(fake.calls).toContainEqual([
    "clearApiCredentials",
    API,
    "read:projects",
  ]);
});

test("an exchange that lands after the next user signed in is waited for, so its credentials never stay in that user's cache", async () => {
  const { fake, anchor } = create();

  fake.login("auth0|ada");
  await anchor.start();

  const release = fake.holdNextExchange();

  const ada = expect(
    getSignedInSession(anchor.session.get()).getToken("api"),
  ).rejects.toMatchObject({ code: "SESSION_CHANGED" });

  await expect
    .poll(() => fake.calls)
    .toContainEqual(["getApiCredentials", API, "read:projects"]);
  fake.login("auth0|grace");
  await anchor.sync();

  const grace = getSignedInSession(anchor.session.get());
  const first = grace.getToken("api");

  // A macrotask lets a mint that never waited finish before the held exchange lands.
  await new Promise((resolve) => setTimeout(resolve, 0));
  release();

  await ada;
  await expect(first).resolves.toMatchObject({
    value: `api.auth0|grace.${API}.4`,
  });
  await expect(grace.getToken("api")).resolves.toMatchObject({
    value: `api.auth0|grace.${API}.4`,
  });
});

test("a login change the application synced forgets which login filled each cache, so a native mint by the other login never reaches the first", async () => {
  const { fake, anchor } = create();

  fake.login("auth0|ada");
  await anchor.start();
  await getSignedInSession(anchor.session.get()).getToken("api");

  fake.login("auth0|grace");
  await anchor.sync();
  await fake.sdk.credentialsManager.clearApiCredentials(API, "read:projects");

  await expect(
    fake.sdk.credentialsManager.getApiCredentials(API, "read:projects"),
  ).resolves.toMatchObject({ accessToken: `api.auth0|grace.${API}.4` });

  fake.login("auth0|ada");
  await anchor.sync();

  await expect(
    getSignedInSession(anchor.session.get()).getToken("api"),
  ).resolves.toMatchObject({ value: `api.auth0|ada.${API}.6` });
});

test("a token asked for a session the credentials manager no longer holds is refused before anything is minted", async () => {
  const { fake, anchor } = create();

  fake.login("auth0|ada");
  await anchor.start();

  const ada = getSignedInSession(anchor.session.get());

  fake.login("auth0|grace");
  fake.calls.length = 0;

  await expect(
    ada.getToken("api", { forceRefresh: true }),
  ).rejects.toMatchObject({ code: "SESSION_CHANGED" });
  expect(fake.calls).toEqual([
    ["hasValidCredentials", undefined],
    ["getCredentials", undefined, undefined, undefined, undefined],
  ]);
});

test("a login saved while an API token was exchanged is SESSION_CHANGED, never the other session's token", async () => {
  const { fake, anchor } = create();

  fake.login("auth0|ada");
  await anchor.start();

  const { getApiCredentials } = fake.sdk.credentialsManager;

  fake.sdk.credentialsManager.getApiCredentials = async (audience, scope) => {
    const credentials = await getApiCredentials(audience, scope);

    fake.login("auth0|grace");

    return credentials;
  };

  await expect(
    getSignedInSession(anchor.session.get()).getToken("api"),
  ).rejects.toMatchObject({ code: "SESSION_CHANGED" });
});

test("a renewal Auth0 refuses asks for the user with INTERACTION_REQUIRED, and any other failure is TOKEN_FAILED with its cause", async () => {
  const { fake, anchor } = create();

  fake.login("auth0|ada");
  await anchor.start();

  const session = getSignedInSession(anchor.session.get());

  const refused = createCredentialsManagerError(
    "RENEW_FAILED",
    "invalid_grant",
    "Unknown or invalid refresh token.",
  );

  fake.failures.renew = refused;

  await expect(
    session.getToken("login", { forceRefresh: true }),
  ).rejects.toMatchObject({ code: "INTERACTION_REQUIRED", cause: refused });

  const offline = createCredentialsManagerError("NO_NETWORK");

  fake.failures.api = offline;

  await expect(session.getToken("api")).rejects.toMatchObject({
    code: "TOKEN_FAILED",
    cause: offline,
  });
});

test("a forced token without a refresh token to renew with asks for the user", async () => {
  const { fake, anchor } = create();

  fake.login("auth0|ada", { refreshable: false });
  await anchor.start();

  await expect(
    getSignedInSession(anchor.session.get()).getToken("login", {
      forceRefresh: true,
    }),
  ).rejects.toMatchObject({
    code: "INTERACTION_REQUIRED",
    cause: { type: "NO_REFRESH_TOKEN" },
  });
});

test("ending clears each declared audience's API credentials and the login, and says Auth0's own session is unknown, with no page to open", async () => {
  const { fake, anchor } = create();

  fake.login("auth0|ada");
  await anchor.start();

  const session = getSignedInSession(anchor.session.get());

  await session.getToken("api");

  expect(fake.apiCredentials()).toEqual([`${API} read:projects`]);

  fake.calls.length = 0;

  await expect(session.end()).resolves.toEqual({
    local: "completed",
    remote: "unknown",
    navigation: null,
  });
  expect(fake.calls).toEqual([
    ["hasValidCredentials", undefined],
    ["getCredentials", undefined, undefined, undefined, undefined],
    ["clearApiCredentials", API, "read:projects"],
    ["clearCredentials"],
  ]);
  expect(fake.stored()).toBe(null);
  expect(fake.apiCredentials()).toEqual([]);
  expect(anchor.session.get()).toEqual({ status: "signed-out" });
});

test("ending a session the credentials manager no longer holds clears nothing", async () => {
  const { fake, anchor } = create();

  fake.login("auth0|ada");
  await anchor.start();

  const ada = getSignedInSession(anchor.session.get());

  fake.login("auth0|grace");

  await expect(ada.end()).resolves.toEqual({
    local: "not-applicable",
    remote: "not-applicable",
    navigation: null,
  });
  expect(fake.parseIdToken(fake.stored()?.idToken ?? "").sub).toBe(
    "auth0|grace",
  );
});

test("an ID token parseIdToken cannot read fails the read, so the first state is unavailable", async () => {
  const fake = createFakeAuth0();
  const unreadable = new Error('ID token is missing the required "sub" claim.');

  const anchor = new Anchor({
    adapter: auth0({
      sdk: fake.sdk,
      domain: AUTH0_DOMAIN,
      parseIdToken: () => {
        throw unreadable;
      },
    }),
  });

  fake.login("auth0|ada");
  await anchor.start();

  expect(anchor.session.get()).toMatchObject({
    status: "unavailable",
    error: { code: "READ_FAILED", cause: unreadable },
  });
});
