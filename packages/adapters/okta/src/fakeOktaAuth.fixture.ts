import type { OktaAuthLike } from "src/types/OktaAuthLike";
import type { OktaAuthStateLike } from "src/types/OktaAuthStateLike";
import type { OktaTokensLike } from "src/types/OktaTokensLike";

type AuthStateHandler = (authState: OktaAuthStateLike) => void;

type FakeAuthState = OktaAuthStateLike & {
  accessToken?: OktaTokensLike["accessToken"];
};

type FakeLogin = {
  sid?: string | undefined;
  withRefreshToken?: boolean;
  tokenType?: string;
};

type FakeOktaAuthOptions = {
  postLogoutRedirectUri?: string;
  signOutRedirectUrl?: boolean;
  accessTokenKey?: string;
};

export const OKTA_ISSUER = "https://anchor.okta.com/oauth2/default";

export const LOGOUT_URL = `${OKTA_ISSUER}/v1/logout`;

const NOW = 1_700_000_000;

const EXPIRE_EARLY = 30;

const isSameAuthState = (previous: FakeAuthState | null, next: FakeAuthState) =>
  previous !== null &&
  previous.isAuthenticated === next.isAuthenticated &&
  JSON.stringify(previous.idToken) === JSON.stringify(next.idToken) &&
  JSON.stringify(previous.accessToken) === JSON.stringify(next.accessToken) &&
  previous.error === next.error;

// As okta-auth-js's isRefreshTokenInvalidError tells it.
const isInvalidRefreshTokenError = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  "errorCode" in error &&
  error.errorCode === "invalid_grant" &&
  "errorSummary" in error &&
  error.errorSummary === "The refresh token is invalid or expired.";

// Modelled on okta-auth-js 8.0.1: the auth state carries the refresh token, a renewal Okta refuses with invalid_grant as an invalid or expired refresh token removes that refresh token, the token manager starts an asynchronous auth state update whenever it adds or removes a token, the auth state manager emits a copy of each changed state to every subscriber and unsubscribe removes every registration of the handler it is given, isAuthenticated needs an access token and an ID token, renew replaces the tokens it renewed and removes the token under its key when it fails, clear removes every token, revoking a token it is given leaves it stored, and getSignOutRedirectUrl builds the logout page from that ID token.
export const createFakeOktaAuth = ({
  postLogoutRedirectUri,
  signOutRedirectUrl = true,
  accessTokenKey = "accessToken",
}: FakeOktaAuthOptions = {}) => {
  const handlers: AuthStateHandler[] = [];
  const renewals: string[] = [];
  const revocations: string[] = [];

  const failures: { renew: unknown; revoke: unknown; transform: unknown } = {
    renew: null,
    revoke: null,
    transform: null,
  };

  let issued = 0;
  let sessions = 0;
  let login: FakeLogin = {};
  let tokens: OktaTokensLike = {};
  let authState: FakeAuthState | null = null;

  const issueTokens = (
    sub: string,
    { sid, withRefreshToken = true, tokenType = "Bearer" }: FakeLogin,
  ): OktaTokensLike => {
    issued += 1;

    return {
      idToken: {
        idToken: `id.${sub}.${issued}`,
        claims: {
          iss: OKTA_ISSUER,
          sub,
          sid: sid ?? `sid_${sessions}`,
          name: sub.toUpperCase(),
          preferred_username: `${sub}@example.com`,
          email: `${sub}@example.com`,
          email_verified: true,
        },
      },
      accessToken: {
        accessToken: `access.${sub}.${issued}`,
        tokenType,
        expiresAt: NOW + 3600,
      },
      ...(withRefreshToken
        ? { refreshToken: { refreshToken: `refresh.${sub}.${issued}` } }
        : {}),
    };
  };

  const updateAuthState = async () => {
    await Promise.resolve();

    const next: FakeAuthState =
      failures.transform === null
        ? {
            isAuthenticated:
              tokens.accessToken !== undefined && tokens.idToken !== undefined,
            idToken: tokens.idToken,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
          }
        : {
            isAuthenticated: false,
            idToken: tokens.idToken,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            error: failures.transform,
          };

    if (isSameAuthState(authState, next)) {
      return next;
    }

    authState = next;

    for (const handler of [...handlers]) {
      handler({ ...next });
    }

    return next;
  };

  const sdk = {
    authStateManager: {
      updateAuthState,
      subscribe: (handler: AuthStateHandler) => {
        handlers.push(handler);
      },
      unsubscribe: (handler: AuthStateHandler) => {
        const kept = handlers.filter((registered) => registered !== handler);

        handlers.splice(0, handlers.length, ...kept);
      },
    },
    tokenManager: {
      getTokensSync: () => ({ ...tokens }),
      hasExpired: (token: { expiresAt: number }) =>
        token.expiresAt - EXPIRE_EARLY <= NOW,
      getStorageKeyByType: (type: "accessToken") =>
        tokens[type] === undefined ? undefined : accessTokenKey,
      renew: async (key: string) => {
        renewals.push(key);

        if (failures.renew !== null) {
          const kept = { ...tokens };

          delete kept.accessToken;

          if (isInvalidRefreshTokenError(failures.renew)) {
            delete kept.refreshToken;
          }

          tokens = kept;
          updateAuthState();

          throw failures.renew;
        }

        const sub = tokens.idToken?.claims.sub;

        if (sub === undefined) {
          throw new Error(
            "renewTokens() was called but there is no existing token",
          );
        }

        tokens = issueTokens(sub, {
          ...login,
          sid: tokens.idToken?.claims.sid,
        });
        updateAuthState();

        return tokens.accessToken;
      },
      clear: () => {
        tokens = {};
        updateAuthState();
      },
    },
    revokeAccessToken: async (
      accessToken?: NonNullable<OktaTokensLike["accessToken"]>,
    ) => {
      revocations.push(`access ${accessToken?.accessToken}`);

      if (failures.revoke !== null) {
        throw failures.revoke;
      }

      return {};
    },
    revokeRefreshToken: async (
      refreshToken?: NonNullable<OktaTokensLike["refreshToken"]>,
    ) => {
      revocations.push(`refresh ${refreshToken?.refreshToken}`);

      if (failures.revoke !== null) {
        throw failures.revoke;
      }

      return {};
    },
    ...(signOutRedirectUrl
      ? {
          getSignOutRedirectUrl: ({
            idToken,
          }: {
            idToken: NonNullable<OktaTokensLike["idToken"]>;
          }) =>
            `${LOGOUT_URL}?id_token_hint=${encodeURIComponent(idToken.idToken)}${
              postLogoutRedirectUri === undefined
                ? ""
                : `&post_logout_redirect_uri=${encodeURIComponent(postLogoutRedirectUri)}`
            }`,
        }
      : {}),
  } satisfies OktaAuthLike;

  return {
    sdk,
    renewals,
    revocations,
    failures,
    tokens: () => tokens,
    listeners: () => handlers.length,
    signIn: (sub: string, options: FakeLogin = {}) => {
      sessions += 1;
      login = options;
      tokens = issueTokens(sub, options);

      return updateAuthState();
    },
    removeAccessToken: () => {
      const kept = { ...tokens };

      delete kept.accessToken;
      tokens = kept;

      return updateAuthState();
    },
    switchSilently: (sub: string) => {
      sessions += 1;
      tokens = issueTokens(sub, {});
    },
    expire: () => {
      const { accessToken } = tokens;

      if (accessToken === undefined) {
        return;
      }

      tokens = { ...tokens, accessToken: { ...accessToken, expiresAt: NOW } };
    },
  };
};
