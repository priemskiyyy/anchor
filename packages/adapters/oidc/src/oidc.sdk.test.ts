import { Anchor } from "@priemskiyyy/anchor";
import type { AnchorSession, SessionState } from "@priemskiyyy/anchor";
import {
  ErrorResponse,
  InMemoryWebStorage,
  UserManager,
  WebStorageStateStore,
} from "oidc-client-ts";
import type { INavigator } from "oidc-client-ts";
import { expect, test, vi } from "vitest";

import { accessToken } from "src/accessToken";
import { oidc } from "src/oidc";

const ISSUER = "https://id.example.com";

const encodeSegment = (value: object) =>
  Buffer.from(JSON.stringify(value)).toString("base64url");

const ID_TOKEN = [
  encodeSegment({ alg: "none", typ: "JWT" }),
  encodeSegment({
    iss: ISSUER,
    aud: "anchor-client",
    sub: "ada",
    sid: "sid_1",
    iat: 1_700_000_000,
    exp: 4_102_444_800,
    name: "Ada Lovelace",
    email: "ada@example.com",
  }),
  "",
].join(".");

const createUserManager = (navigator?: INavigator) =>
  new UserManager(
    {
      authority: ISSUER,
      client_id: "anchor-client",
      redirect_uri: "https://app.example.com/callback",
      post_logout_redirect_uri: "https://app.example.com/goodbye",
      metadata: {
        issuer: ISSUER,
        authorization_endpoint: `${ISSUER}/authorize`,
        token_endpoint: `${ISSUER}/token`,
        end_session_endpoint: `${ISSUER}/logout`,
      },
      automaticSilentRenew: false,
      userStore: new WebStorageStateStore({ store: new InMemoryWebStorage() }),
    },
    navigator,
  );

// The token endpoint is answered in-process, so the real SDK runs every step of its grants without a network.
const answerTokenEndpoint = (refresh: "renew" | "refuse" = "renew") => {
  const grants: string[] = [];

  vi.spyOn(globalThis, "fetch").mockImplementation(async (_input, init) => {
    const grant = new URLSearchParams(String(init?.body)).get("grant_type");

    grants.push(String(grant));

    if (grant === "refresh_token" && refresh === "refuse") {
      return Response.json(
        {
          error: "invalid_grant",
          error_description: "Token is not active",
        },
        { status: 400 },
      );
    }

    return Response.json({
      access_token: `access.${grant}.${grants.length}`,
      token_type: "Bearer",
      id_token: ID_TOKEN,
      refresh_token: "refresh.ada",
      scope: "openid profile email",
    });
  });

  return grants;
};

const getSignedInSession = <TUser, TProfile extends string>(
  state: SessionState<TUser, TProfile>,
): AnchorSession<TUser, TProfile> => {
  if (state.status !== "signed-in") {
    throw new Error(`Expected a session, got ${state.status}.`);
  }

  return state.session;
};

test("the real UserManager resolves as signed out, pushes the user a password grant signs in, and renews a forced token through the refresh token", async () => {
  const grants = answerTokenEndpoint();
  const userManager = createUserManager();

  const anchor = new Anchor({
    adapter: oidc({ sdk: userManager, tokens: { api: accessToken() } }),
  });

  await anchor.start();

  expect(anchor.native).toBe(userManager);
  expect(anchor.session.get()).toEqual({ status: "signed-out" });

  await userManager.signinResourceOwnerCredentials({
    username: "ada",
    password: "correct horse",
  });

  const session = getSignedInSession(anchor.session.get());

  expect(session.principal).toEqual({
    authority: ISSUER,
    subject: "ada",
    tenant: null,
  });
  expect(session.user).toEqual({
    sub: "ada",
    name: "Ada Lovelace",
    given_name: null,
    family_name: null,
    preferred_username: null,
    email: "ada@example.com",
    email_verified: null,
    picture: null,
  });
  await expect(session.getToken("api")).resolves.toEqual({
    value: "access.password.1",
    kind: "access-token",
    scheme: "Bearer",
  });
  await expect(
    session.getToken("api", { forceRefresh: true }),
  ).resolves.toEqual({
    value: "access.refresh_token.2",
    kind: "access-token",
    scheme: "Bearer",
  });
  expect(grants).toEqual(["password", "refresh_token"]);
  expect(getSignedInSession(anchor.session.get()).key).toBe(session.key);

  anchor.dispose();
});

test("a refresh token the real provider refuses with invalid_grant asks for the user with INTERACTION_REQUIRED", async () => {
  answerTokenEndpoint("refuse");

  const userManager = createUserManager();

  const anchor = new Anchor({
    adapter: oidc({ sdk: userManager, tokens: { api: accessToken() } }),
  });

  await userManager.signinResourceOwnerCredentials({
    username: "ada",
    password: "correct horse",
  });
  await anchor.start();

  const renewal = getSignedInSession(anchor.session.get()).getToken("api", {
    forceRefresh: true,
  });

  await expect(renewal).rejects.toMatchObject({
    code: "INTERACTION_REQUIRED",
    cause: expect.any(ErrorResponse),
  });
  await expect(renewal).rejects.toMatchObject({
    cause: { error: "invalid_grant", error_description: "Token is not active" },
  });

  anchor.dispose();
});

test("ending removes the user from the real UserManager and hands back the very page its own signoutRedirect() opens", async () => {
  answerTokenEndpoint();

  const navigations: string[] = [];

  const reference = createUserManager({
    prepare: async () => ({
      navigate: async ({ url }) => {
        navigations.push(url);

        return { url };
      },
      close: () => {},
    }),
    callback: async () => {},
  });

  await reference.signinResourceOwnerCredentials({
    username: "ada",
    password: "correct horse",
  });
  await reference.signoutRedirect();

  const userManager = createUserManager();

  const anchor = new Anchor({
    adapter: oidc({ sdk: userManager, tokens: { api: accessToken() } }),
  });

  await userManager.signinResourceOwnerCredentials({
    username: "ada",
    password: "correct horse",
  });
  await anchor.start();

  await expect(getSignedInSession(anchor.session.get()).end()).resolves.toEqual(
    {
      local: "completed",
      remote: "unknown",
      navigation: {
        url: `${ISSUER}/logout?id_token_hint=${ID_TOKEN}&post_logout_redirect_uri=https%3A%2F%2Fapp.example.com%2Fgoodbye`,
      },
    },
  );
  expect(navigations).toEqual([
    `${ISSUER}/logout?id_token_hint=${ID_TOKEN}&post_logout_redirect_uri=https%3A%2F%2Fapp.example.com%2Fgoodbye`,
  ]);
  await expect(userManager.getUser()).resolves.toBe(null);
  expect(anchor.session.get()).toEqual({ status: "signed-out" });

  anchor.dispose();
});

test("the real UserManager's events reach the adapter until dispose removes its callbacks", async () => {
  answerTokenEndpoint();

  const userManager = createUserManager();
  const observer = { session: vi.fn(), invalidate: vi.fn() };
  const session = oidc({ sdk: userManager }).open(observer);

  await userManager.signinResourceOwnerCredentials({
    username: "ada",
    password: "correct horse",
  });

  expect(observer.session.mock.calls).toEqual([
    [expect.objectContaining({ status: "signed-in" })],
  ]);

  await session.dispose?.();
  await userManager.signinResourceOwnerCredentials({
    username: "ada",
    password: "correct horse",
  });
  await userManager.removeUser();

  expect(observer.session.mock.calls).toHaveLength(1);
  expect(observer.invalidate.mock.calls).toEqual([]);
});
