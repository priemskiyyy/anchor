import { expect, test } from "vitest";

import { accessToken } from "src/accessToken";
import { AUTH0_ISSUER, createFakeAuth0 } from "src/fakeAuth0.fixture";
import { ApiCredentialsCaches } from "src/utils/ApiCredentialsCaches";
import { getSessionAccessToken } from "src/utils/getSessionAccessToken";

const API = "https://api.example.com";

const tokens = {
  api: accessToken({ audience: API }),
  login: accessToken(),
  scoped: accessToken({ scope: "openid profile" }),
  projects: accessToken({ audience: API, scope: "read:projects" }),
};

const request = (
  profile: string,
  subject: string,
  forceRefresh = false,
  context: string | null = null,
) => ({
  profile,
  forceRefresh,
  session: {
    principal: { authority: AUTH0_ISSUER, subject, tenant: null },
    context,
  },
  signal: new AbortController().signal,
});

test("a profile without an audience answers the stored access token, with its token type as the scheme", async () => {
  const fake = createFakeAuth0({ tokenType: "Bearer" });
  const caches = new ApiCredentialsCaches();

  fake.login("auth0|ada");

  await expect(
    getSessionAccessToken(
      fake.sdk,
      fake.parseIdToken,
      caches,
      tokens,
      request("login", "auth0|ada"),
    ),
  ).resolves.toEqual({
    value: "access.auth0|ada.1",
    kind: "access-token",
    scheme: "Bearer",
  });
});

test("a scope without an audience asks the credentials manager for credentials of that scope", async () => {
  const fake = createFakeAuth0();
  const caches = new ApiCredentialsCaches();

  fake.login("auth0|ada");

  await expect(
    getSessionAccessToken(
      fake.sdk,
      fake.parseIdToken,
      caches,
      tokens,
      request("scoped", "auth0|ada"),
    ),
  ).resolves.toMatchObject({ value: "access.auth0|ada.2" });
  expect(fake.calls.at(-1)).toEqual([
    "getCredentials",
    "openid profile",
    undefined,
    undefined,
    false,
  ]);
});

test("an audience's token is exchanged once and answered from the credentials manager's cache after that", async () => {
  const fake = createFakeAuth0();
  const caches = new ApiCredentialsCaches();

  fake.login("auth0|ada");

  const mint = () =>
    getSessionAccessToken(
      fake.sdk,
      fake.parseIdToken,
      caches,
      tokens,
      request("api", "auth0|ada"),
    );

  await expect(mint()).resolves.toEqual({
    value: `api.auth0|ada.${API}.2`,
    kind: "access-token",
    scheme: "DPoP",
  });
  await expect(mint()).resolves.toMatchObject({
    value: `api.auth0|ada.${API}.2`,
  });
  expect(fake.apiCredentials()).toEqual([`${API} `]);
});

test("each scope of an audience is its own cache, cleared before this login's first mint of it", async () => {
  const fake = createFakeAuth0();
  const caches = new ApiCredentialsCaches();

  fake.login("auth0|ada");
  await getSessionAccessToken(
    fake.sdk,
    fake.parseIdToken,
    caches,
    tokens,
    request("api", "auth0|ada"),
  );
  fake.calls.length = 0;

  await getSessionAccessToken(
    fake.sdk,
    fake.parseIdToken,
    caches,
    tokens,
    request("projects", "auth0|ada"),
  );

  expect(fake.calls).toContainEqual([
    "clearApiCredentials",
    API,
    "read:projects",
  ]);
});

test("the same user in another organization never inherits the API credentials minted in the first", async () => {
  const fake = createFakeAuth0();
  const caches = new ApiCredentialsCaches();

  fake.login("auth0|ada", { org: "org_acme" });
  await getSessionAccessToken(
    fake.sdk,
    fake.parseIdToken,
    caches,
    tokens,
    request("api", "auth0|ada", false, "org_acme"),
  );
  fake.login("auth0|ada", { org: "org_globex" });

  await expect(
    getSessionAccessToken(
      fake.sdk,
      fake.parseIdToken,
      caches,
      tokens,
      request("api", "auth0|ada", false, "org_globex"),
    ),
  ).resolves.toMatchObject({ value: `api.auth0|ada.${API}.4` });
});

test("another session, or none, is refused with SESSION_CHANGED before anything is minted", async () => {
  const fake = createFakeAuth0();
  const caches = new ApiCredentialsCaches();

  await expect(
    getSessionAccessToken(
      fake.sdk,
      fake.parseIdToken,
      caches,
      tokens,
      request("api", "auth0|ada", true),
    ),
  ).rejects.toMatchObject({ code: "SESSION_CHANGED" });

  fake.login("auth0|grace");

  await expect(
    getSessionAccessToken(
      fake.sdk,
      fake.parseIdToken,
      caches,
      tokens,
      request("api", "auth0|ada", true),
    ),
  ).rejects.toMatchObject({ code: "SESSION_CHANGED" });

  fake.login("auth0|ada", { org: "org_acme" });

  await expect(
    getSessionAccessToken(
      fake.sdk,
      fake.parseIdToken,
      caches,
      tokens,
      request("login", "auth0|ada", true, "org_globex"),
    ),
  ).rejects.toMatchObject({ code: "SESSION_CHANGED" });
  expect(
    fake.calls.flatMap(([method]) =>
      method === "getApiCredentials" || method === "clearApiCredentials"
        ? [method]
        : [],
    ),
  ).toEqual([]);
  expect(fake.calls.at(-1)).toEqual([
    "getCredentials",
    undefined,
    undefined,
    undefined,
    undefined,
  ]);
});

test("a renewal whose ID token names another session is SESSION_CHANGED, never its token", async () => {
  const fake = createFakeAuth0();
  const caches = new ApiCredentialsCaches();

  fake.login("auth0|ada");

  const { getCredentials } = fake.sdk.credentialsManager;

  fake.sdk.credentialsManager.getCredentials = async (
    scope,
    minTtl,
    parameters,
    forceRefresh,
  ) => {
    if (forceRefresh === true) {
      fake.login("auth0|grace");
    }

    return getCredentials(scope, minTtl, parameters, forceRefresh);
  };

  await expect(
    getSessionAccessToken(
      fake.sdk,
      fake.parseIdToken,
      caches,
      tokens,
      request("login", "auth0|ada", true),
    ),
  ).rejects.toMatchObject({ code: "SESSION_CHANGED" });
});

test("an undeclared profile is refused with INVALID_CONFIGURATION before the credentials manager is asked", async () => {
  const fake = createFakeAuth0();
  const caches = new ApiCredentialsCaches();

  fake.login("auth0|ada");

  await expect(
    getSessionAccessToken(
      fake.sdk,
      fake.parseIdToken,
      caches,
      tokens,
      request("billing", "auth0|ada"),
    ),
  ).rejects.toMatchObject({
    code: "INVALID_CONFIGURATION",
    message: 'The Auth0 adapter declares no token profile named "billing".',
  });
  expect(fake.calls).toEqual([]);
});

test("the credentials manager losing its credentials mid-request is SESSION_CHANGED, and a refused exchange asks for the user", async () => {
  const fake = createFakeAuth0();
  const caches = new ApiCredentialsCaches();

  fake.login("auth0|ada");

  const missing = Object.assign(new Error("No credentials were found."), {
    type: "NO_CREDENTIALS",
  });

  fake.failures.api = missing;

  await expect(
    getSessionAccessToken(
      fake.sdk,
      fake.parseIdToken,
      caches,
      tokens,
      request("api", "auth0|ada"),
    ),
  ).rejects.toMatchObject({ code: "SESSION_CHANGED", cause: missing });

  const refused = Object.assign(
    new Error("Unknown or invalid refresh token."),
    {
      code: "invalid_grant",
      type: "RENEW_FAILED",
    },
  );

  fake.failures.api = refused;

  await expect(
    getSessionAccessToken(
      fake.sdk,
      fake.parseIdToken,
      caches,
      tokens,
      request("api", "auth0|ada"),
    ),
  ).rejects.toMatchObject({ code: "INTERACTION_REQUIRED", cause: refused });
});
