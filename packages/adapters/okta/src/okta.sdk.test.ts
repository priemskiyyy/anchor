import { Anchor } from "@priemskiyyy/anchor";
import type { AnchorSession, SessionState } from "@priemskiyyy/anchor";
import { OktaAuth } from "@okta/okta-auth-js";
import { expect, test, vi } from "vitest";

import { accessToken } from "src/accessToken";
import { okta } from "src/okta";

const ISSUER = "https://anchor.okta.com/oauth2/default";

const encodeSegment = (value: object) =>
  Buffer.from(JSON.stringify(value)).toString("base64url");

const createJwt = (claims: object) =>
  [
    encodeSegment({ alg: "RS256", kid: "anchor" }),
    encodeSegment(claims),
    "signature",
  ].join(".");

const getClaims = () => {
  const issuedAt = Math.floor(Date.now() / 1000);

  return {
    iss: ISSUER,
    aud: "anchor-client",
    sub: "00u_ada",
    sid: "idx_1",
    iat: issuedAt,
    exp: issuedAt + 3600,
    name: "Ada Lovelace",
    preferred_username: "ada@example.com",
    email: "ada@example.com",
    email_verified: true,
  };
};

const createTokens = () => {
  const claims = getClaims();
  const scopes = ["openid", "profile", "email", "offline_access"];
  const authorizeUrl = `${ISSUER}/v1/authorize`;

  return {
    idToken: {
      idToken: createJwt(claims),
      claims,
      expiresAt: claims.exp,
      scopes,
      authorizeUrl,
      issuer: ISSUER,
      clientId: "anchor-client",
    },
    accessToken: {
      accessToken: createJwt({ iss: ISSUER, sub: "00u_ada", jti: "at_0" }),
      tokenType: "Bearer",
      expiresAt: claims.exp,
      scopes,
      authorizeUrl,
      userinfoUrl: `${ISSUER}/v1/userinfo`,
    },
    refreshToken: {
      refreshToken: "refresh_0",
      expiresAt: claims.exp,
      scopes,
      authorizeUrl,
      tokenUrl: `${ISSUER}/v1/token`,
      issuer: ISSUER,
    },
  };
};

// Okta's endpoints are answered in-process, so the real okta-auth-js runs its grants and revocations without a network.
const answerOkta = () => {
  const endpoints: { requests: string[]; refuse: boolean } = {
    requests: [],
    refuse: false,
  };

  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = String(input);
    const body = new URLSearchParams(String(init?.body));

    if (url.endsWith("/.well-known/openid-configuration")) {
      return Response.json({ issuer: ISSUER });
    }

    endpoints.requests.push(
      url.endsWith("/v1/revoke")
        ? `revoke ${body.get("token_type_hint")} ${body.get("token")}`
        : `token ${body.get("grant_type")}`,
    );

    if (url.endsWith("/v1/revoke")) {
      return new Response(null, { status: 200 });
    }

    if (endpoints.refuse) {
      return Response.json(
        {
          error: "invalid_grant",
          error_description: "The refresh token is invalid or expired.",
        },
        { status: 400 },
      );
    }

    return Response.json({
      token_type: "Bearer",
      expires_in: 3600,
      scope: "openid profile email offline_access",
      access_token: createJwt({ iss: ISSUER, sub: "00u_ada", jti: "at_1" }),
      id_token: createJwt(getClaims()),
      refresh_token: "refresh_1",
    });
  });

  return endpoints;
};

const createOktaAuth = () =>
  new OktaAuth({
    issuer: ISSUER,
    clientId: "anchor-client",
    redirectUri: "https://app.example.com/callback",
    postLogoutRedirectUri: "https://app.example.com/goodbye",
    tokenManager: { storage: "memory", autoRenew: false, autoRemove: false },
    ignoreSignature: true,
  });

const getSignedInSession = <TUser, TProfile extends string>(
  state: SessionState<TUser, TProfile>,
): AnchorSession<TUser, TProfile> => {
  if (state.status !== "signed-in") {
    throw new Error(`Expected a session, got ${state.status}.`);
  }

  return state.session;
};

test("the real OktaAuth resolves as signed out, pushes the tokens its token manager stores, and renews a forced token through the refresh token grant", async () => {
  const requests = answerOkta().requests;
  const oktaAuth = createOktaAuth();

  const anchor = new Anchor({
    adapter: okta({ sdk: oktaAuth, tokens: { api: accessToken() } }),
  });

  await anchor.start();

  expect(anchor.native).toBe(oktaAuth);
  expect(anchor.session.get()).toEqual({ status: "signed-out" });

  const tokens = createTokens();

  oktaAuth.tokenManager.setTokens(tokens);

  await expect.poll(() => anchor.session.get().status).toBe("signed-in");

  const session = getSignedInSession(anchor.session.get());

  expect(session.principal).toEqual({
    authority: ISSUER,
    subject: "00u_ada",
    tenant: null,
  });
  expect(session.user).toEqual({
    sub: "00u_ada",
    name: "Ada Lovelace",
    preferred_username: "ada@example.com",
    given_name: null,
    family_name: null,
    email: "ada@example.com",
    email_verified: true,
  });
  await expect(session.getToken("api")).resolves.toEqual({
    value: tokens.accessToken.accessToken,
    kind: "access-token",
    scheme: "Bearer",
  });
  await expect(
    session.getToken("api", { forceRefresh: true }),
  ).resolves.toEqual({
    value: createJwt({ iss: ISSUER, sub: "00u_ada", jti: "at_1" }),
    kind: "access-token",
    scheme: "Bearer",
  });
  expect(requests).toEqual(["token refresh_token"]);
  expect(getSignedInSession(anchor.session.get()).key).toBe(session.key);

  anchor.dispose();
});

test("a renewal the real Okta refuses with invalid_grant removes its access token first, so the session is signed out and the token rejects with SESSION_CHANGED", async () => {
  answerOkta().refuse = true;

  const oktaAuth = createOktaAuth();

  const anchor = new Anchor({
    adapter: okta({ sdk: oktaAuth, tokens: { api: accessToken() } }),
  });

  oktaAuth.tokenManager.setTokens(createTokens());
  await anchor.start();

  await expect(
    getSignedInSession(anchor.session.get()).getToken("api", {
      forceRefresh: true,
    }),
  ).rejects.toMatchObject({ code: "SESSION_CHANGED" });
  expect(anchor.session.get()).toEqual({ status: "signed-out" });
  expect(oktaAuth.tokenManager.getTokensSync().accessToken).toBe(undefined);

  anchor.dispose();
});

test("ending revokes through the real revoke endpoint, clears the token manager and hands back the page okta-auth-js builds for the ID token", async () => {
  const requests = answerOkta().requests;
  const oktaAuth = createOktaAuth();

  const anchor = new Anchor({
    adapter: okta({ sdk: oktaAuth, tokens: { api: accessToken() } }),
  });

  const tokens = createTokens();

  oktaAuth.tokenManager.setTokens(tokens);
  await anchor.start();

  await expect(getSignedInSession(anchor.session.get()).end()).resolves.toEqual(
    {
      local: "completed",
      remote: "unknown",
      navigation: {
        url: `${ISSUER}/v1/logout?id_token_hint=${tokens.idToken.idToken}&post_logout_redirect_uri=https%3A%2F%2Fapp.example.com%2Fgoodbye`,
      },
    },
  );
  expect(requests).toEqual([
    "revoke refresh_token refresh_0",
    `revoke access_token ${tokens.accessToken.accessToken}`,
  ]);
  expect(oktaAuth.tokenManager.getTokensSync()).toEqual({});
  expect(anchor.session.get()).toEqual({ status: "signed-out" });

  anchor.dispose();
});

test("the real auth state manager reaches the adapter until dispose unsubscribes its handler", async () => {
  answerOkta();

  const oktaAuth = createOktaAuth();
  const observer = { session: vi.fn(), invalidate: vi.fn() };
  const session = okta({ sdk: oktaAuth }).open(observer);

  oktaAuth.tokenManager.setTokens(createTokens());

  await expect
    .poll(() => observer.session.mock.calls)
    .toEqual([[expect.objectContaining({ status: "signed-in" })]]);

  await session.dispose?.();
  oktaAuth.tokenManager.clear();
  await oktaAuth.authStateManager.updateAuthState();

  expect(observer.session.mock.calls).toHaveLength(1);
  expect(observer.invalidate.mock.calls).toEqual([]);
});
