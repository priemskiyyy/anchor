import { Anchor } from "@priemskiyyy/anchor";
import type { AnchorSession, SessionState } from "@priemskiyyy/anchor";
import Auth0, {
  CredentialsManagerError,
  parseIdToken,
} from "react-native-auth0";
import { beforeEach, expect, test, vi } from "vitest";

import { accessToken } from "src/accessToken";
import { auth0 } from "src/auth0";

type NativeCredentials = {
  idToken: string;
  accessToken: string;
  tokenType: string;
  expiresAt: number;
  refreshToken?: string;
  scope?: string;
};

// A0Auth0, the TurboModule react-native-auth0 5.11.1 calls, over memory, answering and rejecting with the codes its NativeBridge.swift gives.
const native = vi.hoisted(() => {
  const calls: [string, ...unknown[]][] = [];

  const state: {
    configured: string | null;
    credentials: NativeCredentials | null;
    renewal: { code: string; message: string } | null;
    initialization: Promise<void>;
  } = {
    configured: null,
    credentials: null,
    renewal: null,
    initialization: Promise.resolve(),
  };

  const createNativeError = (code: string, message: string) =>
    Object.assign(new Error(message), { code });

  const module = {
    getBundleIdentifier: async () => "com.example.anchor",
    hasValidAuth0InstanceWithConfiguration: async (
      clientId: string,
      domain: string,
    ) => state.configured === `${clientId} ${domain}`,
    initializeAuth0WithConfiguration: async (
      clientId: string,
      domain: string,
    ) => {
      calls.push(["initializeAuth0WithConfiguration", clientId, domain]);
      await state.initialization;
      state.configured = `${clientId} ${domain}`;
    },
    hasValidCredentials: async (minTTL: number) => {
      calls.push(["hasValidCredentials", minTTL]);

      return (
        state.credentials !== null &&
        (state.credentials.refreshToken !== undefined ||
          state.credentials.expiresAt > Date.now() / 1000)
      );
    },
    getCredentials: async (
      scope: string | undefined,
      minTTL: number,
      parameters: object,
      forceRefresh: boolean,
    ) => {
      calls.push(["getCredentials", scope, minTTL, parameters, forceRefresh]);

      const credentials = state.credentials;

      if (credentials === null) {
        throw createNativeError("NO_CREDENTIALS", "No credentials were found.");
      }

      if (!forceRefresh) {
        return { ...credentials };
      }

      if (state.renewal !== null) {
        throw createNativeError(state.renewal.code, state.renewal.message);
      }

      state.credentials = {
        ...credentials,
        accessToken: `${credentials.accessToken}.renewed`,
      };

      return { ...state.credentials };
    },
    getApiCredentials: async (
      audience: string,
      scope: string | undefined,
      minTTL: number,
      parameters: object,
    ) => {
      calls.push(["getApiCredentials", audience, scope, minTTL, parameters]);

      if (state.credentials === null) {
        throw createNativeError("NO_CREDENTIALS", "No credentials were found.");
      }

      return {
        accessToken: `api.${audience}`,
        tokenType: "DPoP",
        expiresAt: 2_000_000_000,
        scope,
      };
    },
    clearApiCredentials: async (
      audience: string,
      scope: string | undefined,
    ) => {
      calls.push(["clearApiCredentials", audience, scope]);

      return true;
    },
    clearCredentials: async () => {
      calls.push(["clearCredentials"]);
      state.credentials = null;

      return true;
    },
  };

  return { calls, state, module };
});

vi.mock("react-native", () => ({
  Platform: { OS: "ios" },
  Linking: { addEventListener: () => ({ remove: () => {} }) },
  TurboModuleRegistry: { getEnforcing: () => native.module },
}));

// Node would load the CommonJS main, which requires React Native's Flow source past the mock; the package's own ESM build keeps it replaceable.
vi.mock("react-native-auth0", () =>
  vi.importActual("react-native-auth0/lib/module/index.js"),
);

const DOMAIN = "anchor-demo.us.auth0.com";

const API = "https://api.example.com";

const encodeSegment = (value: object) =>
  Buffer.from(JSON.stringify(value)).toString("base64url");

const createIdToken = (claims: object) =>
  [
    encodeSegment({ alg: "RS256", typ: "JWT" }),
    encodeSegment(claims),
    "signature",
  ].join(".");

const storeLogin = (sub: string) => {
  native.state.credentials = {
    idToken: createIdToken({
      iss: `https://${DOMAIN}/`,
      aud: "anchor-client",
      sub,
      sid: "sid_1",
      org_id: "org_acme",
      iat: 1_700_000_000,
      exp: 2_000_000_000,
      name: "Ada Lovelace",
      email: "ada@example.com",
      email_verified: true,
    }),
    accessToken: `access.${sub}`,
    tokenType: "DPoP",
    expiresAt: 2_000_000_000,
    refreshToken: `refresh.${sub}`,
  };
};

const createAnchor = (clientId: string) => {
  const client = new Auth0({ domain: DOMAIN, clientId });

  const anchor = new Anchor({
    adapter: auth0({
      sdk: client,
      domain: DOMAIN,
      parseIdToken,
      tokens: {
        api: accessToken({ audience: API, scope: "read:projects" }),
        login: accessToken(),
      },
    }),
  });

  return { client, anchor };
};

const getSignedInSession = <TUser, TProfile extends string>(
  state: SessionState<TUser, TProfile>,
): AnchorSession<TUser, TProfile> => {
  if (state.status !== "signed-in") {
    throw new Error(`Expected a session, got ${state.status}.`);
  }

  return state.session;
};

const flushMicrotasks = async () => {
  for (let turn = 0; turn < 20; turn += 1) {
    await Promise.resolve();
  }
};

beforeEach(() => {
  native.calls.length = 0;
  native.state.credentials = null;
  native.state.renewal = null;
  native.state.initialization = Promise.resolve();
});

test("the real react-native-auth0 is initializing while its native module initializes, then resolves as signed out with nothing stored", async () => {
  let finishInitialization = () => {};

  native.state.initialization = new Promise<void>((resolve) => {
    finishInitialization = resolve;
  });

  const { client, anchor } = createAnchor("anchor-initializing");
  const started = anchor.start();

  await flushMicrotasks();

  expect(anchor.session.get()).toEqual({ status: "initializing" });
  expect(native.calls).toEqual([
    ["initializeAuth0WithConfiguration", "anchor-initializing", DOMAIN],
  ]);

  finishInitialization();
  await started;

  expect(anchor.native).toBe(client);
  expect(anchor.session.get()).toEqual({ status: "signed-out" });
  expect(native.calls).toContainEqual(["hasValidCredentials", 0]);

  anchor.dispose();
});

test("stored credentials are a session of the domain's issuer and the subject the real parseIdToken reads, whose tokens come from the credentials manager", async () => {
  storeLogin("auth0|ada");

  const { anchor } = createAnchor("anchor-session");

  await anchor.start();

  const session = getSignedInSession(anchor.session.get());

  expect(session.principal).toEqual({
    authority: `https://${DOMAIN}/`,
    subject: "auth0|ada",
    tenant: null,
  });
  expect(session.user).toEqual({
    sub: "auth0|ada",
    name: "Ada Lovelace",
    nickname: null,
    picture: null,
    email: "ada@example.com",
    emailVerified: true,
  });
  await expect(session.getToken("login")).resolves.toEqual({
    value: "access.auth0|ada",
    kind: "access-token",
    scheme: "DPoP",
  });
  await expect(session.getToken("api")).resolves.toEqual({
    value: `api.${API}`,
    kind: "access-token",
    scheme: "DPoP",
  });
  expect(native.calls).toContainEqual([
    "getApiCredentials",
    API,
    "read:projects",
    0,
    {},
  ]);

  anchor.dispose();
});

test.each([
  ["iOS", "invalid_grant"],
  ["Android", "RENEW_FAILED"],
])(
  "a renewal the native module refuses with the code %s gives, %s, reaches the adapter as react-native-auth0's CredentialsManagerError and asks for the user",
  async (_platform, code) => {
    storeLogin("auth0|ada");
    native.state.renewal = {
      code,
      message:
        "An error occurred while trying to use the Refresh Token to renew the Credentials.",
    };

    const { anchor } = createAnchor(`anchor-renewal-${code}`);

    await anchor.start();

    const failure = await getSignedInSession(anchor.session.get())
      .getToken("login", { forceRefresh: true })
      .catch((error: unknown) => error);

    expect(failure).toMatchObject({
      code: "INTERACTION_REQUIRED",
      cause: { type: "RENEW_FAILED", code },
    });
    expect(failure).toHaveProperty(
      "cause",
      expect.any(CredentialsManagerError),
    );

    anchor.dispose();
  },
);

test("ending clears the native module's API credentials and credentials, after which it holds no session", async () => {
  storeLogin("auth0|ada");

  const { client, anchor } = createAnchor("anchor-ending");

  await anchor.start();

  await expect(getSignedInSession(anchor.session.get()).end()).resolves.toEqual(
    { local: "completed", remote: "unknown", navigation: null },
  );
  expect(native.calls).toContainEqual([
    "clearApiCredentials",
    API,
    "read:projects",
  ]);
  expect(native.calls.at(-1)).toEqual(["clearCredentials"]);
  expect(anchor.session.get()).toEqual({ status: "signed-out" });
  await expect(client.credentialsManager.hasValidCredentials()).resolves.toBe(
    false,
  );

  anchor.dispose();
});
