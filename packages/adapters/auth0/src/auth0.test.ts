import { Anchor } from "@priemskiyyy/anchor";
import type { AnchorSession, SessionState } from "@priemskiyyy/anchor";
import { expect, test } from "vitest";

import { accessToken } from "src/accessToken";
import { auth0 } from "src/auth0";
import {
  AUTH0_ISSUER,
  createFakeAuth0Client,
} from "src/fakeAuth0Client.fixture";

const create = (returnTo?: string) => {
  const fake = createFakeAuth0Client();

  const anchor = new Anchor({
    adapter: auth0({
      sdk: fake.sdk,
      tokens: {
        api: accessToken({
          audience: "https://api.example.com",
          scope: "read:projects",
        }),
        reports: accessToken({ audience: "https://reports.example.com" }),
      },
      ...(returnTo === undefined ? {} : { returnTo }),
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

test("creating the adapter reads and calls nothing on the client", () => {
  const fake = createFakeAuth0Client();
  const touched: PropertyKey[] = [];

  const sdk = new Proxy(fake.sdk, {
    get: (target, key, receiver) => {
      touched.push(key);

      return Reflect.get(target, key, receiver);
    },
  });

  const adapter = auth0({ sdk });

  expect(touched).toEqual([]);
  expect(adapter.native).toBe(sdk);
  expect(adapter.name).toBe("auth0");
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

test("the ID token names the session: its issuer and subject, its session and organization, an actor, and the profile claims", async () => {
  const { fake, anchor } = create();

  fake.login("auth0|ada", { org: "org_acme", impersonatedBy: "auth0|support" });
  await anchor.start();

  const session = getSignedInSession(anchor.session.get());

  expect(session.principal).toEqual({
    authority: AUTH0_ISSUER,
    subject: "auth0|ada",
    tenant: null,
  });
  expect(session.impersonated).toBe(true);
  expect(session.user).toEqual({
    sub: "auth0|ada",
    name: "AUTH0|ADA",
    nickname: "auth0|ada",
    picture: "https://cdn.example.com/auth0|ada.png",
    email: "auth0|ada@example.com",
    email_verified: true,
  });
});

test("the same user in another organization, or a new login of the same user, is a new session", async () => {
  const { fake, anchor } = create();

  fake.login("auth0|ada", { org: "org_acme" });
  await anchor.start();

  const acme = getSignedInSession(anchor.session.get());

  fake.login("auth0|ada", { org: "org_globex" });
  await anchor.sync();

  const globex = getSignedInSession(anchor.session.get());

  expect(globex.key).not.toBe(acme.key);

  fake.login("auth0|ada", { org: "org_globex" });
  await anchor.sync();

  expect(getSignedInSession(anchor.session.get()).key).not.toBe(globex.key);
});

test("a mapper receives the ID token claims and its result is the session's user", async () => {
  const fake = createFakeAuth0Client();

  const anchor = new Anchor({
    adapter: auth0({
      sdk: fake.sdk,
      user: (claims) => ({ id: claims.sub, email: claims.email }),
    }),
  });

  fake.login("auth0|ada");
  await anchor.start();

  expect(getSignedInSession(anchor.session.get()).user).toEqual({
    id: "auth0|ada",
    email: "auth0|ada@example.com",
  });
});

test("each profile mints for its own audience and scope, from the cache unless forced", async () => {
  const { fake, anchor } = create();

  fake.login("auth0|ada");
  await anchor.start();

  const session = getSignedInSession(anchor.session.get());

  await expect(session.getToken("api")).resolves.toEqual({
    value: "access.auth0|ada.https://api.example.com.1",
    kind: "access-token",
    scheme: "Bearer",
  });
  await session.getToken("reports", { forceRefresh: true });

  expect(fake.tokens).toEqual([
    {
      authorizationParams: {
        audience: "https://api.example.com",
        scope: "read:projects",
      },
      cacheMode: "on",
      detailedResponse: true,
    },
    {
      authorizationParams: { audience: "https://reports.example.com" },
      cacheMode: "off",
      detailedResponse: true,
    },
  ]);
});

test("a token asked for a session the client no longer holds is refused before Auth0 is asked", async () => {
  const { fake, anchor } = create();

  fake.login("auth0|ada");
  await anchor.start();

  const ada = getSignedInSession(anchor.session.get());

  fake.login("auth0|grace");

  await expect(ada.getToken("api")).rejects.toMatchObject({
    code: "SESSION_CHANGED",
  });
  expect(fake.tokens).toEqual([]);
});

test("login_required and its kind ask for the user with INTERACTION_REQUIRED, and any other failure is TOKEN_FAILED with its cause", async () => {
  const { fake, anchor } = create();

  fake.login("auth0|ada");
  await anchor.start();

  const session = getSignedInSession(anchor.session.get());

  const consent = Object.assign(new Error("Consent required"), {
    error: "consent_required",
  });

  fake.failures.token = consent;

  await expect(session.getToken("api")).rejects.toMatchObject({
    code: "INTERACTION_REQUIRED",
    cause: consent,
  });

  const timeout = Object.assign(new Error("Timeout"), { error: "timeout" });

  fake.failures.token = timeout;

  await expect(session.getToken("api")).rejects.toMatchObject({
    code: "TOKEN_FAILED",
    cause: timeout,
  });
});

test("ending clears the client's session and hands over Auth0's logout page, returning where the application asked", async () => {
  const { fake, anchor } = create("https://app.example.com/goodbye");

  fake.login("auth0|ada");
  await anchor.start();

  await expect(getSignedInSession(anchor.session.get()).end()).resolves.toEqual(
    {
      local: "completed",
      remote: "unknown",
      navigation: {
        url: `${AUTH0_ISSUER}v2/logout?client_id=anchor-client&returnTo=https%3A%2F%2Fapp.example.com%2Fgoodbye`,
      },
    },
  );
  expect(fake.logouts).toEqual([
    {
      openUrl: expect.any(Function),
      logoutParams: { returnTo: "https://app.example.com/goodbye" },
    },
  ]);
  expect(anchor.session.get()).toEqual({ status: "signed-out" });
});

test("ending a session the client no longer holds logs nobody out", async () => {
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
  expect(fake.logouts).toEqual([]);
});

test("an ID token without a subject is outside the contract, so the first state is unavailable", async () => {
  const fake = createFakeAuth0Client();

  const anchor = new Anchor({
    adapter: auth0({
      sdk: {
        ...fake.sdk,
        getIdTokenClaims: async () => ({ iss: AUTH0_ISSUER }),
      },
    }),
  });

  await anchor.start();

  expect(anchor.session.get()).toMatchObject({
    status: "unavailable",
    error: { code: "INVALID_ANSWER" },
  });
});
