import type { Auth0Like } from "src/types/Auth0Like";
import type { Auth0UserLike } from "src/types/Auth0UserLike";

type FakeClaims = {
  iss: string;
  aud: string;
  sub: string;
  sid: string;
  org_id?: string;
  act?: { sub: string };
  name: string;
  nickname: string;
  picture: string;
  email: string;
  email_verified: boolean;
};

type FakeCredentials = {
  idToken: string;
  accessToken: string;
  tokenType: string;
  expiresAt: number;
  refreshToken?: string;
  scope?: string;
};

type FakeApiCredentials = {
  accessToken: string;
  tokenType: string;
  expiresAt: number;
  scope?: string;
};

type FakeLogin = {
  org?: string;
  impersonatedBy?: string;
  refreshable?: boolean;
  scope?: string | undefined;
};

export const AUTH0_DOMAIN = "anchor-demo.us.auth0.com";

export const AUTH0_ISSUER = `https://${AUTH0_DOMAIN}/`;

const EXPIRES_AT = 2_000_000_000;

// Modelled on react-native-auth0 5.11.1: the credentials manager stores one login, hasValidCredentials is true while it holds credentials it can use or renew, getCredentials answers them and renews first when forced, expired or asked for another scope, failing as a CredentialsManagerError whose type is NO_CREDENTIALS without credentials and NO_REFRESH_TOKEN without a refresh token, getApiCredentials exchanges the refresh token once per audience and scope and answers that cache until clearApiCredentials removes it, whoever logs in next (an exchange held with holdNextExchange writes into the cache only once released, as a slow exchange lands after a later one), clearCredentials removes the login and leaves the API credentials, and parseIdToken builds the user from the ID token without its protocol claims (iss, aud, sid), camelCasing email_verified.
export const createFakeAuth0 = ({
  tokenType = "DPoP",
}: { tokenType?: string } = {}) => {
  const calls: [string, ...unknown[]][] = [];
  const claims = new Map<string, FakeClaims>();
  const apiCredentials = new Map<string, FakeApiCredentials>();

  const failures: { renew: unknown; api: unknown } = {
    renew: null,
    api: null,
  };

  let issued = 0;
  let sessions = 0;
  let expired = false;
  let stored: FakeCredentials | null = null;
  let held: Promise<void> | null = null;

  const createCredentialsManagerError = (type: string, message: string) =>
    Object.assign(new Error(message), { name: type, code: type, type });

  const issueCredentials = (
    login: FakeClaims,
    { refreshable = true, scope }: FakeLogin,
  ): FakeCredentials => {
    issued += 1;

    const idToken = `id.${login.sub}.${issued}`;

    claims.set(idToken, login);

    return {
      idToken,
      accessToken: `access.${login.sub}.${issued}`,
      tokenType,
      expiresAt: EXPIRES_AT,
      ...(refreshable
        ? { refreshToken: `refresh.${login.sub}.${issued}` }
        : {}),
      ...(scope === undefined ? {} : { scope }),
    };
  };

  const getStoredClaims = (credentials: FakeCredentials) => {
    const login = claims.get(credentials.idToken);

    if (login === undefined) {
      throw new Error(`The fake issued no ID token ${credentials.idToken}.`);
    }

    return login;
  };

  const renew = (credentials: FakeCredentials, scope: string | undefined) => {
    if (credentials.refreshToken === undefined) {
      throw createCredentialsManagerError(
        "NO_REFRESH_TOKEN",
        "Credentials need to be renewed but no Refresh Token is available to renew them.",
      );
    }

    if (failures.renew !== null) {
      throw failures.renew;
    }

    const renewed = issueCredentials(getStoredClaims(credentials), {
      scope: scope ?? credentials.scope,
    });

    stored = renewed;
    expired = false;

    return renewed;
  };

  const sdk = {
    credentialsManager: {
      hasValidCredentials: async (minTtl?: number) => {
        calls.push(["hasValidCredentials", minTtl]);

        return (
          stored !== null && (stored.refreshToken !== undefined || !expired)
        );
      },
      getCredentials: async (
        scope?: string,
        minTtl?: number,
        parameters?: Record<string, unknown>,
        forceRefresh?: boolean,
      ) => {
        calls.push(["getCredentials", scope, minTtl, parameters, forceRefresh]);

        const credentials = stored;

        if (credentials === null) {
          throw createCredentialsManagerError(
            "NO_CREDENTIALS",
            "No credentials were found.",
          );
        }

        if (
          forceRefresh !== true &&
          !expired &&
          (scope === undefined || scope === credentials.scope)
        ) {
          return { ...credentials };
        }

        return { ...renew(credentials, scope) };
      },
      getApiCredentials: async (audience: string, scope?: string) => {
        calls.push(["getApiCredentials", audience, scope]);

        const credentials = stored;

        if (credentials === null) {
          throw createCredentialsManagerError(
            "NO_CREDENTIALS",
            "No credentials were found.",
          );
        }

        const key = `${audience} ${scope ?? ""}`;
        const cached = apiCredentials.get(key);

        if (cached !== undefined) {
          return { ...cached };
        }

        if (credentials.refreshToken === undefined) {
          throw createCredentialsManagerError(
            "NO_REFRESH_TOKEN",
            "Credentials need to be renewed but no Refresh Token is available to renew them.",
          );
        }

        if (failures.api !== null) {
          throw failures.api;
        }

        issued += 1;

        const exchanged = {
          accessToken: `api.${getStoredClaims(credentials).sub}.${audience}.${issued}`,
          tokenType,
          expiresAt: EXPIRES_AT,
          ...(scope === undefined ? {} : { scope }),
        };

        const hold = held;

        held = null;
        await hold;
        apiCredentials.set(key, exchanged);

        return { ...exchanged };
      },
      clearApiCredentials: async (audience: string, scope?: string) => {
        calls.push(["clearApiCredentials", audience, scope]);
        apiCredentials.delete(`${audience} ${scope ?? ""}`);
      },
      clearCredentials: async () => {
        calls.push(["clearCredentials"]);
        stored = null;
        expired = false;
      },
    },
  } satisfies Auth0Like;

  const parseIdToken = (idToken: string): Auth0UserLike => {
    const login = claims.get(idToken);

    if (login === undefined) {
      throw new Error(`Invalid token specified: ${idToken}`);
    }

    return {
      sub: login.sub,
      ...(login.org_id === undefined ? {} : { org_id: login.org_id }),
      ...(login.act === undefined ? {} : { act: login.act }),
      name: login.name,
      nickname: login.nickname,
      picture: login.picture,
      email: login.email,
      emailVerified: login.email_verified,
    };
  };

  return {
    sdk,
    parseIdToken,
    calls,
    failures,
    stored: () => stored,
    apiCredentials: () => [...apiCredentials.keys()],
    login: (
      sub: string,
      { org, impersonatedBy, ...options }: FakeLogin = {},
    ) => {
      sessions += 1;
      expired = false;
      stored = issueCredentials(
        {
          iss: AUTH0_ISSUER,
          aud: "anchor-client",
          sub,
          sid: `sid_${sessions}`,
          ...(org === undefined ? {} : { org_id: org }),
          ...(impersonatedBy === undefined
            ? {}
            : { act: { sub: impersonatedBy } }),
          name: sub.toUpperCase(),
          nickname: sub,
          picture: `https://cdn.example.com/${sub}.png`,
          email: `${sub}@example.com`,
          email_verified: true,
        },
        options,
      );
    },
    expire: () => {
      expired = true;
    },
    holdNextExchange: () => {
      let release = () => {};

      held = new Promise<void>((resolve) => {
        release = resolve;
      });

      return release;
    },
  };
};
