import { Anchor } from "@priemskiyyy/anchor";
import type { AnchorSession, SessionState } from "@priemskiyyy/anchor";
import { Amplify } from "aws-amplify";
import * as auth from "aws-amplify/auth";
import { Hub } from "aws-amplify/utils";
import { expect, test, vi } from "vitest";

import { accessToken } from "src/accessToken";
import { amplify } from "src/amplify";
import { idToken } from "src/idToken";

const USER_POOL_ID = "us-east-1_AnchorPool";

const CLIENT_ID = "anchorclient123";

const ISSUER = `https://cognito-idp.us-east-1.amazonaws.com/${USER_POOL_ID}`;

const JSON_HEADERS = { "content-type": "application/x-amz-json-1.1" };

const encodeSegment = (value: object) =>
  Buffer.from(JSON.stringify(value)).toString("base64url");

const createJwt = (claims: object) =>
  [
    encodeSegment({ alg: "RS256", kid: "anchor" }),
    encodeSegment(claims),
    "signature",
  ].join(".");

// Cognito's user pool API is answered in-process, so the real Amplify signs in, refreshes and revokes without a network.
const answerCognito = () => {
  const cognito: { calls: string[]; refuse: string | null } = {
    calls: [],
    refuse: null,
  };

  let signIns = 0;

  vi.spyOn(globalThis, "fetch").mockImplementation(async (_input, init) => {
    const operation = (
      new Headers(init?.headers).get("x-amz-target") ?? ""
    ).replace("AWSCognitoIdentityProviderService.", "");

    cognito.calls.push(operation);

    if (operation === "RevokeToken") {
      return new Response("{}", { status: 200, headers: JSON_HEADERS });
    }

    if (cognito.refuse !== null && operation === "GetTokensFromRefreshToken") {
      return new Response(
        JSON.stringify({
          __type: cognito.refuse,
          message: "Refresh Token has been revoked",
        }),
        {
          status: 400,
          headers: {
            ...JSON_HEADERS,
            "x-amzn-errortype": `${cognito.refuse}:`,
          },
        },
      );
    }

    if (operation === "InitiateAuth") {
      signIns += 1;
    }

    const issuedAt = Math.floor(Date.now() / 1000);

    const claims = {
      iss: ISSUER,
      sub: "7c1f-ada",
      origin_jti: `origin-${signIns}`,
      auth_time: issuedAt,
      iat: issuedAt,
      exp: issuedAt + 3600,
    };

    return new Response(
      JSON.stringify({
        AuthenticationResult: {
          AccessToken: createJwt({
            ...claims,
            token_use: "access",
            client_id: CLIENT_ID,
            username: "ada",
            jti: `access-${cognito.calls.length}`,
          }),
          IdToken: createJwt({
            ...claims,
            token_use: "id",
            aud: CLIENT_ID,
            "cognito:username": "ada",
            email: "ada@example.com",
            jti: `id-${cognito.calls.length}`,
          }),
          ...(operation === "InitiateAuth"
            ? { RefreshToken: `refresh-${signIns}` }
            : {}),
          ExpiresIn: 3600,
          TokenType: "Bearer",
        },
        ChallengeParameters: {},
      }),
      { status: 200, headers: JSON_HEADERS },
    );
  });

  return cognito;
};

const configureSignedOut = async () => {
  Amplify.configure({
    Auth: {
      Cognito: { userPoolId: USER_POOL_ID, userPoolClientId: CLIENT_ID },
    },
  });

  const cognito = answerCognito();

  await auth.signOut({ global: false });
  cognito.calls.length = 0;

  return cognito;
};

const signInWithPassword = () =>
  auth.signIn({
    username: "ada",
    password: "correct horse battery staple",
    options: { authFlowType: "USER_PASSWORD_AUTH" },
  });

const createAnchor = () =>
  new Anchor({
    adapter: amplify({
      sdk: { auth, hub: Hub },
      tokens: { api: accessToken(), identity: idToken() },
    }),
  });

const getSignedInSession = <TUser, TProfile extends string>(
  state: SessionState<TUser, TProfile>,
): AnchorSession<TUser, TProfile> => {
  if (state.status !== "signed-in") {
    throw new Error(`Expected a session, got ${state.status}.`);
  }

  return state.session;
};

test("the real Amplify with no user is signed out on getCurrentUser's word, and a password sign-in reaches the session through the Hub as the user pool's issuer and the subject", async () => {
  await configureSignedOut();

  const anchor = createAnchor();

  await anchor.start();

  expect(anchor.native.auth).toBe(auth);
  expect(anchor.session.get()).toEqual({ status: "signed-out" });

  await signInWithPassword();

  await expect.poll(() => anchor.session.get().status).toBe("signed-in");

  const session = getSignedInSession(anchor.session.get());

  expect(session.principal).toEqual({
    authority: ISSUER,
    subject: "7c1f-ada",
    tenant: null,
  });
  expect(session.user).toEqual({
    username: "ada",
    userId: "7c1f-ada",
    signInDetails: { loginId: "ada", authFlowType: "USER_PASSWORD_AUTH" },
  });

  anchor.dispose();
});

test("the real fetchAuthSession mints the session's access and ID tokens, and a forced token refreshes through GetTokensFromRefreshToken and keeps the key", async () => {
  const cognito = await configureSignedOut();

  await signInWithPassword();

  const anchor = createAnchor();

  await anchor.start();

  const session = getSignedInSession(anchor.session.get());
  const { tokens } = await auth.fetchAuthSession();

  await expect(session.getToken("api")).resolves.toEqual({
    value: tokens?.accessToken.toString(),
    kind: "access-token",
    scheme: "Bearer",
  });
  await expect(session.getToken("identity")).resolves.toEqual({
    value: tokens?.idToken?.toString(),
    kind: "id-token",
    scheme: null,
  });

  const forced = await session.getToken("api", { forceRefresh: true });
  const refreshed = await auth.fetchAuthSession();

  expect(forced.value).toBe(refreshed.tokens?.accessToken.toString());
  expect(cognito.calls).toEqual(["InitiateAuth", "GetTokensFromRefreshToken"]);
  expect(getSignedInSession(anchor.session.get()).key).toBe(session.key);

  anchor.dispose();
});

test("a refresh the real Cognito refuses with NotAuthorizedException clears Amplify's tokens, so the token rejects with SESSION_CHANGED and the session is signed out", async () => {
  const cognito = await configureSignedOut();

  await signInWithPassword();

  const anchor = createAnchor();

  await anchor.start();

  cognito.refuse = "NotAuthorizedException";

  await expect(
    getSignedInSession(anchor.session.get()).getToken("api", {
      forceRefresh: true,
    }),
  ).rejects.toMatchObject({ code: "SESSION_CHANGED" });
  await expect
    .poll(() => anchor.session.get())
    .toEqual({ status: "signed-out" });
  expect((await auth.fetchAuthSession()).tokens).toBe(undefined);

  anchor.dispose();
});

test("ending signs this device out through the real signOut, which revokes the refresh token and dispatches signedOut, so the ending is complete locally", async () => {
  const cognito = await configureSignedOut();

  await signInWithPassword();

  const anchor = createAnchor();

  await anchor.start();

  await expect(getSignedInSession(anchor.session.get()).end()).resolves.toEqual(
    { local: "completed", remote: "unknown", navigation: null },
  );
  expect(cognito.calls).toEqual(["InitiateAuth", "RevokeToken"]);
  expect(anchor.session.get()).toEqual({ status: "signed-out" });
  await expect(auth.getCurrentUser()).rejects.toMatchObject({
    name: "UserUnAuthenticatedException",
  });

  anchor.dispose();
});

test("the real Hub reaches the adapter until dispose stops its listener", async () => {
  await configureSignedOut();

  const observer = { session: vi.fn(), invalidate: vi.fn() };
  const session = amplify({ sdk: { auth, hub: Hub } }).open(observer);

  await signInWithPassword();

  expect(observer.invalidate.mock.calls).toEqual([[]]);

  await session.dispose?.();
  await auth.signOut({ global: false });

  expect(observer.session.mock.calls).toEqual([]);
  expect(observer.invalidate.mock.calls).toEqual([[]]);
});

test("the real Amplify configured without a user pool is unavailable, never signed out", async () => {
  Amplify.configure({});

  const anchor = createAnchor();

  await anchor.start();

  expect(anchor.session.get()).toMatchObject({
    status: "unavailable",
    error: { code: "READ_FAILED", cause: { name: "AuthUserPoolException" } },
  });

  anchor.dispose();
});
