// @vitest-environment jsdom
import { Anchor } from "@priemskiyyy/anchor";
import type { AnchorSession, SessionState } from "@priemskiyyy/anchor";
import Keycloak from "keycloak-js";
import { expect, test, vi } from "vitest";

import { accessToken } from "src/accessToken";
import { keycloak } from "src/keycloak";

const SERVER = "https://sso.example.com";

const ISSUER = `${SERVER}/realms/anchor`;

const encodeSegment = (value: object) =>
  Buffer.from(JSON.stringify(value)).toString("base64url");

const createToken = (claims: object) =>
  [encodeSegment({ alg: "none", typ: "JWT" }), encodeSegment(claims), ""].join(
    ".",
  );

const issueTokens = (serial: number) => {
  const issuedAt = Math.floor(Date.now() / 1000);

  const claims = {
    iss: ISSUER,
    sub: "ada",
    sid: "sid_1",
    azp: "anchor-client",
    iat: issuedAt,
    exp: issuedAt + 300,
    name: "Ada Lovelace",
    preferred_username: "ada",
    email: "ada@example.com",
    email_verified: true,
  };

  return {
    access_token: createToken({ ...claims, typ: "Bearer", jti: `a${serial}` }),
    refresh_token: createToken({
      ...claims,
      typ: "Refresh",
      jti: `r${serial}`,
    }),
    id_token: createToken({ ...claims, typ: "ID", jti: `i${serial}` }),
    token_type: "Bearer",
    expires_in: 300,
  };
};

// The token endpoint is answered in-process, so the real keycloak-js runs its refreshes without a network.
const answerTokenEndpoint = () => {
  const endpoint = { refreshes: 0, refuse: false };

  vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
    endpoint.refreshes += 1;

    if (endpoint.refuse) {
      return Response.json(
        { error: "invalid_grant", error_description: "Session not active" },
        { status: 400 },
      );
    }

    return Response.json(issueTokens(endpoint.refreshes));
  });

  return endpoint;
};

const createInstance = () =>
  new Keycloak({ url: SERVER, realm: "anchor", clientId: "anchor-client" });

const initializeWithTokens = (instance: Keycloak) => {
  const tokens = issueTokens(0);

  return instance.init({
    token: tokens.access_token,
    refreshToken: tokens.refresh_token,
    idToken: tokens.id_token,
    checkLoginIframe: false,
  });
};

const getSignedInSession = <TUser, TProfile extends string>(
  state: SessionState<TUser, TProfile>,
): AnchorSession<TUser, TProfile> => {
  if (state.status !== "signed-in") {
    throw new Error(`Expected a session, got ${state.status}.`);
  }

  return state.session;
};

test("the real keycloak-js started before init() stays initializing until init() finishes, then answers the realm's issuer and subject and mints its tokens", async () => {
  const endpoint = answerTokenEndpoint();
  const instance = createInstance();

  const anchor = new Anchor({
    adapter: keycloak({ sdk: instance, tokens: { api: accessToken() } }),
  });

  const started = anchor.start();

  expect(anchor.session.get()).toEqual({ status: "initializing" });

  await initializeWithTokens(instance);
  await started;

  const session = getSignedInSession(anchor.session.get());

  expect(anchor.native).toBe(instance);
  expect(session.principal).toEqual({
    authority: ISSUER,
    subject: "ada",
    tenant: null,
  });
  expect(session.user).toEqual({
    sub: "ada",
    name: "Ada Lovelace",
    preferred_username: "ada",
    given_name: null,
    family_name: null,
    email: "ada@example.com",
    email_verified: true,
  });
  await expect(session.getToken("api")).resolves.toEqual({
    value: instance.token,
    kind: "access-token",
    scheme: "Bearer",
  });
  expect(endpoint.refreshes).toBe(1);

  const forced = await session.getToken("api", { forceRefresh: true });

  expect(endpoint.refreshes).toBe(2);
  expect(forced.value).toBe(instance.token);
  expect(getSignedInSession(anchor.session.get()).key).toBe(session.key);

  anchor.dispose();
});

test("a refresh the real Keycloak refuses with a 400 is INTERACTION_REQUIRED, after keycloak-js cleared its tokens and reported the logout", async () => {
  const endpoint = answerTokenEndpoint();
  const instance = createInstance();
  const observer = { session: vi.fn(), invalidate: vi.fn() };

  const adapterSession = keycloak({
    sdk: instance,
    tokens: { api: accessToken() },
  }).open(observer);

  await initializeWithTokens(instance);

  endpoint.refuse = true;

  await expect(
    adapterSession.getToken?.({
      profile: "api",
      forceRefresh: true,
      session: {
        principal: { authority: ISSUER, subject: "ada", tenant: null },
        context: '[null,"sid_1"]',
      },
      signal: new AbortController().signal,
    }),
  ).rejects.toMatchObject({
    code: "INTERACTION_REQUIRED",
    cause: { response: { status: 400 } },
  });
  expect(instance.token).toBe(undefined);
  expect(observer.session.mock.calls.at(-1)).toEqual([
    { status: "signed-out" },
  ]);

  await adapterSession.dispose?.();
});

test("ending takes the real GET logout page before clearing the tokens, keeps the application's onAuthLogout, never calls logout(), and dispose restores the callbacks", async () => {
  answerTokenEndpoint();

  const instance = createInstance();
  const heard: string[] = [];

  const onAuthLogout = () => {
    heard.push("logout");
  };

  instance.onAuthLogout = onAuthLogout;

  const logout = vi.spyOn(instance, "logout");
  const initialized = initializeWithTokens(instance);

  const anchor = new Anchor({
    adapter: keycloak({
      sdk: instance,
      initialized,
      tokens: { api: accessToken() },
    }),
  });

  await initialized;
  await anchor.start();

  const idToken = instance.idToken ?? "";

  await expect(getSignedInSession(anchor.session.get()).end()).resolves.toEqual(
    {
      local: "completed",
      remote: "unknown",
      navigation: {
        url: `${ISSUER}/protocol/openid-connect/logout?client_id=anchor-client&post_logout_redirect_uri=${encodeURIComponent(location.href)}&id_token_hint=${idToken}`,
      },
    },
  );
  expect(logout.mock.calls).toEqual([]);
  expect(instance.token).toBe(undefined);
  expect(heard).toEqual(["logout"]);
  expect(anchor.session.get()).toEqual({ status: "signed-out" });

  anchor.dispose();

  expect(instance.onAuthLogout).toBe(onAuthLogout);
  expect(instance.onAuthSuccess).toBe(undefined);
  expect(instance.onReady).toBe(undefined);
});
