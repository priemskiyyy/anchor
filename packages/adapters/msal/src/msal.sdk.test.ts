// @vitest-environment jsdom
// @vitest-environment-options {"url": "https://app.example.com/"}
import { Anchor } from "@priemskiyyy/anchor";
import type { AnchorSession, SessionState } from "@priemskiyyy/anchor";
import { PublicClientApplication } from "@azure/msal-browser";
import { expect, test, vi } from "vitest";

import { accessToken } from "src/accessToken";
import { msal } from "src/msal";

const TENANT = "8f0b5f2e-6c7d-4d0f-9e33-5b6a2f6c1a11";

const CLIENT_ID = "3fa1d2c4-5b6e-4f70-8a91-b2c3d4e5f607";

const AUTHORITY = `https://login.microsoftonline.com/${TENANT}`;

const ISSUER = `${AUTHORITY}/v2.0`;

const SCOPE = "api://anchor/read";

const ADA_OID = "00000000-0000-0000-66f3-3332eca7ea81";

const GRACE_OID = "00000000-0000-0000-9a41-5c2d1e0f7b63";

const encodeSegment = (value: object) =>
  Buffer.from(JSON.stringify(value)).toString("base64url");

const createJwt = (claims: object) =>
  [
    encodeSegment({ alg: "RS256", typ: "JWT", kid: "anchor" }),
    encodeSegment(claims),
    "signature",
  ].join(".");

const issueTokens = (name: string, serial: number) => {
  const oid = name === "grace" ? GRACE_OID : ADA_OID;
  const issuedAt = Math.floor(Date.now() / 1000);

  return {
    token_type: "Bearer",
    scope: `${SCOPE} openid profile offline_access`,
    expires_in: 3600,
    ext_expires_in: 3600,
    access_token: `access.${name}.${serial}`,
    refresh_token: `refresh.${name}.${serial}`,
    id_token: createJwt({
      aud: CLIENT_ID,
      iss: ISSUER,
      iat: issuedAt,
      nbf: issuedAt,
      exp: issuedAt + 3600,
      name: name === "grace" ? "Grace Hopper" : "Ada Lovelace",
      oid,
      preferred_username: `${name}@contoso.example`,
      sid: `sid.${name}`,
      sub: `pairwise.${name}`,
      tid: TENANT,
      ver: "2.0",
    }),
    client_info: encodeSegment({ uid: oid, utid: TENANT }),
  };
};

// The token endpoint is answered in-process, so the real MSAL.js exchanges codes and refreshes tokens without a network.
const answerTokenEndpoint = () => {
  const endpoint: { grants: string[]; refuse: boolean } = {
    grants: [],
    refuse: false,
  };

  vi.spyOn(globalThis, "fetch").mockImplementation(async (_input, init) => {
    const body = new URLSearchParams(String(init?.body));

    endpoint.grants.push(body.get("grant_type") ?? "");

    if (endpoint.refuse) {
      return Response.json(
        {
          error: "interaction_required",
          error_description:
            "AADSTS50076: Due to a configuration change made by your administrator, you must use multi-factor authentication.",
          error_codes: [50076],
          suberror: "basic_action",
        },
        { status: 400 },
      );
    }

    const [, name = "", serial = "0"] = (
      body.get("code") ??
      body.get("refresh_token") ??
      ""
    ).split(".");

    return Response.json(issueTokens(name, Number(serial) + 1));
  });

  return endpoint;
};

const createClient = (
  cacheLocation: "sessionStorage" | "localStorage" = "sessionStorage",
) =>
  new PublicClientApplication({
    auth: {
      clientId: CLIENT_ID,
      authority: AUTHORITY,
      redirectUri: "https://app.example.com/",
      authorityMetadata: JSON.stringify({
        issuer: ISSUER,
        authorization_endpoint: `${AUTHORITY}/oauth2/v2.0/authorize`,
        token_endpoint: `${AUTHORITY}/oauth2/v2.0/token`,
        end_session_endpoint: `${AUTHORITY}/oauth2/v2.0/logout`,
        jwks_uri: `${AUTHORITY}/discovery/v2.0/keys`,
      }),
      cloudDiscoveryMetadata: JSON.stringify({
        tenant_discovery_endpoint: `${ISSUER}/.well-known/openid-configuration`,
        "api-version": "1.1",
        metadata: [
          {
            preferred_network: "login.microsoftonline.com",
            preferred_cache: "login.windows.net",
            aliases: ["login.microsoftonline.com", "login.windows.net"],
          },
        ],
      }),
    },
    cache: { cacheLocation },
  });

const signInWithCode = async (
  client: PublicClientApplication,
  name: string,
) => {
  const { account } = await client.acquireTokenByCode({
    code: `code.${name}`,
    scopes: [SCOPE],
  });

  return account;
};

const restoreSignedInClient = async () => {
  const previous = createClient("localStorage");

  await previous.initialize();
  previous.setActiveAccount(await signInWithCode(previous, "ada"));

  return createClient("localStorage");
};

const clearStorage = () => {
  localStorage.clear();
  sessionStorage.clear();
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

test("a real client restored from localStorage and started before initialize() is initializing until initialized settles, then answers the account it restored", async () => {
  clearStorage();
  answerTokenEndpoint();

  const client = await restoreSignedInClient();
  const initialized = client.initialize();
  const anchor = new Anchor({ adapter: msal({ sdk: client, initialized }) });
  const statuses: string[] = [];

  anchor.session.subscribe(() => statuses.push(anchor.session.get().status));
  await anchor.start();

  expect(statuses).toEqual(["signed-in"]);
  expect(getSignedInSession(anchor.session.get()).principal).toEqual({
    authority: "login.windows.net",
    subject: `${ADA_OID}.${TENANT}`,
    tenant: TENANT,
  });

  anchor.dispose();
});

test("without initialized, the real client's first read fails with MSAL's own uninitialized error instead of signing out, and initializeEnd reads the account it restored", async () => {
  clearStorage();
  answerTokenEndpoint();

  const client = await restoreSignedInClient();
  const anchor = new Anchor({ adapter: msal({ sdk: client }) });

  await anchor.start();

  expect(anchor.session.get()).toMatchObject({
    status: "unavailable",
    error: {
      code: "READ_FAILED",
      cause: {
        name: "BrowserAuthError",
        errorCode: "uninitialized_public_client_application",
      },
    },
  });

  await client.initialize();

  await expect
    .poll(() => getSubject(anchor.session.get()))
    .toBe(`${ADA_OID}.${TENANT}`);

  anchor.dispose();
});

test("an account the real client caches from a code exchange is no session until the application makes it active, and its tokens come from MSAL's cache, refreshed through the refresh token grant when forced", async () => {
  clearStorage();

  const endpoint = answerTokenEndpoint();
  const client = createClient();

  await client.initialize();

  const anchor = new Anchor({
    adapter: msal({
      sdk: client,
      tokens: { api: accessToken({ scopes: [SCOPE] }) },
    }),
  });

  await anchor.start();

  const account = await signInWithCode(client, "ada");

  await anchor.sync();

  expect(anchor.session.get()).toEqual({ status: "signed-out" });

  client.setActiveAccount(account);

  await expect.poll(() => anchor.session.get().status).toBe("signed-in");

  const session = getSignedInSession(anchor.session.get());

  expect(session.user).toEqual({
    homeAccountId: `${ADA_OID}.${TENANT}`,
    environment: "login.windows.net",
    tenantId: TENANT,
    username: "ada@contoso.example",
    localAccountId: ADA_OID,
    name: "Ada Lovelace",
  });
  await expect(session.getToken("api")).resolves.toEqual({
    value: "access.ada.1",
    kind: "access-token",
    scheme: "Bearer",
  });
  await expect(
    session.getToken("api", { forceRefresh: true }),
  ).resolves.toEqual({
    value: "access.ada.2",
    kind: "access-token",
    scheme: "Bearer",
  });
  expect(endpoint.grants).toEqual(["authorization_code", "refresh_token"]);
  expect(getSignedInSession(anchor.session.get()).key).toBe(session.key);

  anchor.dispose();
});

test("a refresh Microsoft Entra ID refuses with interaction_required rejects with INTERACTION_REQUIRED and MSAL's error as its cause, and the session stays", async () => {
  clearStorage();

  const endpoint = answerTokenEndpoint();
  const client = createClient();

  await client.initialize();
  client.setActiveAccount(await signInWithCode(client, "ada"));

  const anchor = new Anchor({
    adapter: msal({
      sdk: client,
      tokens: { api: accessToken({ scopes: [SCOPE] }) },
    }),
  });

  await anchor.start();

  endpoint.refuse = true;

  await expect(
    getSignedInSession(anchor.session.get()).getToken("api", {
      forceRefresh: true,
    }),
  ).rejects.toMatchObject({
    code: "INTERACTION_REQUIRED",
    cause: {
      name: "InteractionRequiredAuthError",
      errorCode: "interaction_required",
      subError: "basic_action",
    },
  });
  expect(getSubject(anchor.session.get())).toBe(`${ADA_OID}.${TENANT}`);

  anchor.dispose();
});

test("ending clears only the session's account from the real cache and keeps the other account MSAL holds", async () => {
  clearStorage();
  answerTokenEndpoint();

  const client = createClient();

  await client.initialize();

  const ada = await signInWithCode(client, "ada");

  await signInWithCode(client, "grace");
  client.setActiveAccount(ada);

  const anchor = new Anchor({ adapter: msal({ sdk: client }) });

  await anchor.start();

  await expect(getSignedInSession(anchor.session.get()).end()).resolves.toEqual(
    { local: "completed", remote: "unknown", navigation: null },
  );
  expect(client.getActiveAccount()).toBe(null);
  expect(client.getAllAccounts().map(({ username }) => username)).toEqual([
    "grace@contoso.example",
  ]);
  expect(anchor.session.get()).toEqual({ status: "signed-out" });

  anchor.dispose();
});

test("an active account another tab sets on a shared localStorage cache reaches the session through MSAL's broadcast, until dispose removes the adapter's callback", async () => {
  clearStorage();
  answerTokenEndpoint();

  const otherTab = createClient("localStorage");
  const client = createClient("localStorage");
  const heard: string[] = [];

  await otherTab.initialize();
  await client.initialize();
  client.addEventCallback(
    ({ eventType }) => heard.push(eventType),
    ["msal:activeAccountChanged"],
  );

  const observer = { session: vi.fn(), invalidate: vi.fn() };
  const session = msal({ sdk: client }).open(observer);

  otherTab.setActiveAccount(await signInWithCode(otherTab, "ada"));

  await expect.poll(() => observer.invalidate.mock.calls).toEqual([[]]);
  await expect(
    session.read({ signal: new AbortController().signal }),
  ).resolves.toMatchObject({
    status: "signed-in",
    principal: { subject: `${ADA_OID}.${TENANT}` },
  });

  await session.dispose?.();
  otherTab.setActiveAccount(null);

  await expect.poll(() => heard).toHaveLength(2);
  expect(observer.invalidate.mock.calls).toEqual([[]]);
  expect(client.getActiveAccount()).toBe(null);
});
