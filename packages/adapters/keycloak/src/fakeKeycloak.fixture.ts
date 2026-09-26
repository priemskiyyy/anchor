import type { KeycloakLike } from "src/types/KeycloakLike";

type FakeLogin = {
  sid?: string;
  organization?: unknown;
  refreshable?: boolean;
  name?: string;
};

type FakeKeycloak = KeycloakLike & { idToken?: string | undefined };

export const KEYCLOAK_ISSUER = "https://sso.example.com/realms/anchor";

export const LOGOUT_ENDPOINT = `${KEYCLOAK_ISSUER}/protocol/openid-connect/logout`;

export const REDIRECT_URI = "https://app.example.com/";

// Modelled on keycloak-js 26.2.4: didInitialize turns true as init() begins and onReady is called once it finished, every callback is a single property called as a method of the instance, updateToken refreshes when forced with -1 or when the token expires within the minimum validity and throws without a refresh token, a refresh Keycloak refuses with a 400 clears the tokens and calls onAuthLogout before it rejects, createLogoutUrl builds the GET logout page from the ID token and throws for a provider without an end-session endpoint, and clearToken calls onAuthLogout only while a token is held.
export const createFakeKeycloak = ({
  initialized = true,
  endSessionEndpoint = true,
}: { initialized?: boolean; endSessionEndpoint?: boolean } = {}) => {
  const updates: number[] = [];
  const logoutUrls: unknown[] = [];
  const failures: { update: unknown } = { update: null };
  const expiry = { expiring: false, refused: false };
  let issued = 0;
  let sessions = 0;
  let login: FakeLogin = {};

  const setTokens = (sub: string | null, options: FakeLogin = {}) => {
    if (sub === null) {
      sdk.token = undefined;
      sdk.tokenParsed = undefined;
      sdk.refreshToken = undefined;
      sdk.idToken = undefined;

      return;
    }

    const { sid, organization, refreshable = true, name } = options;

    issued += 1;
    login = options;
    sdk.token = `access.${sub}.${issued}`;
    sdk.idToken = `id.${sub}.${issued}`;
    sdk.refreshToken = refreshable ? `refresh.${sub}.${issued}` : undefined;
    sdk.tokenParsed = {
      iss: KEYCLOAK_ISSUER,
      sub,
      sid: sid ?? `sid_${sessions}`,
      ...(organization === undefined ? {} : { organization }),
      name: name ?? sub.toUpperCase(),
      preferred_username: sub,
      email: `${sub}@example.com`,
      email_verified: true,
    };
  };

  const sdk: FakeKeycloak = {
    didInitialize: initialized,
    updateToken: async (minValidity) => {
      updates.push(minValidity);

      if (sdk.refreshToken === undefined) {
        throw new Error("Unable to update token, no refresh token available.");
      }

      if (failures.update !== null) {
        throw failures.update;
      }

      if (expiry.refused) {
        sdk.clearToken();

        throw Object.assign(
          new Error("Server responded with an invalid status."),
          { response: new Response(null, { status: 400 }) },
        );
      }

      if (minValidity !== -1 && !expiry.expiring) {
        return false;
      }

      expiry.expiring = false;
      setTokens(sdk.tokenParsed?.sub ?? null, {
        ...login,
        sid: sdk.tokenParsed?.sid ?? `sid_${sessions}`,
      });
      sdk.onAuthRefreshSuccess?.();

      return true;
    },
    createLogoutUrl: (options) => {
      logoutUrls.push(options);

      if (!endSessionEndpoint) {
        throw new Error("Not supported by the OIDC server");
      }

      const params = new URLSearchParams([
        ["client_id", "anchor-client"],
        ["post_logout_redirect_uri", REDIRECT_URI],
      ]);

      if (sdk.idToken !== undefined) {
        params.append("id_token_hint", sdk.idToken);
      }

      return `${LOGOUT_ENDPOINT}?${params.toString()}`;
    },
    clearToken: () => {
      if (sdk.token === undefined) {
        return;
      }

      setTokens(null);
      sdk.onAuthLogout?.();
    },
  };

  return {
    sdk,
    /** The promise init() returned, settled already when the instance was created initialized. */
    initialized: Promise.resolve(initialized),
    updates,
    logoutUrls,
    failures,
    listeners: () =>
      [
        sdk.onReady,
        sdk.onAuthSuccess,
        sdk.onAuthRefreshSuccess,
        sdk.onAuthLogout,
      ].filter((callback) => callback !== undefined).length,
    init: (sub: string | null) => {
      sdk.didInitialize = true;

      if (sub !== null) {
        sessions += 1;
        setTokens(sub);
        sdk.onAuthSuccess?.();
      }

      sdk.onReady?.(sub !== null);
    },
    login: (sub: string, options: FakeLogin = {}) => {
      sessions += 1;
      setTokens(sub, options);
      sdk.onAuthSuccess?.();
    },
    switchSilently: (sub: string) => {
      sessions += 1;
      setTokens(sub);
    },
    expire: () => {
      expiry.expiring = true;
    },
    refuseRefresh: () => {
      expiry.refused = true;
    },
    renameOnRefresh: (name: string) => {
      login = { ...login, name };
    },
  };
};
