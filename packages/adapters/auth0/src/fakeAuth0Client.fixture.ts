import type { Auth0ClaimsLike } from "src/types/Auth0ClaimsLike";
import type { Auth0ClientLike } from "src/types/Auth0ClientLike";

type TokenCall = Parameters<Auth0ClientLike["getTokenSilently"]>[0];

type LogoutCall = Parameters<Auth0ClientLike["logout"]>[0];

type FakeLogin = { org?: string; impersonatedBy?: string };

export const AUTH0_ISSUER = "https://anchor-demo.us.auth0.com/";

// Modelled on auth0-spa-js 2.27.0: the ID token claims come from the client's cache, getTokenSilently answers per audience and scope, a token its silent iframe mints answers, and caches, whoever Auth0's session cookie names after a login in another tab, and logout with an openUrl function clears the cache and hands over the logout URL instead of navigating.
export const createFakeAuth0Client = () => {
  const tokens: TokenCall[] = [];
  const logouts: LogoutCall[] = [];
  const failures: { token: unknown } = { token: null };
  let issued = 0;
  let sessions = 0;
  let claims: Auth0ClaimsLike | undefined;
  let elsewhere: string | null = null;

  const login = (sub: string, { org, impersonatedBy }: FakeLogin = {}) => {
    sessions += 1;
    claims = {
      iss: AUTH0_ISSUER,
      sub,
      sid: `sid_${sessions}`,
      ...(org === undefined ? {} : { org_id: org }),
      ...(impersonatedBy === undefined ? {} : { act: { sub: impersonatedBy } }),
      name: sub.toUpperCase(),
      nickname: sub,
      picture: `https://cdn.example.com/${sub}.png`,
      email: `${sub}@example.com`,
      email_verified: true,
    };
  };

  const sdk = {
    getIdTokenClaims: async () => claims,
    getTokenSilently: async (options: TokenCall) => {
      tokens.push(options);

      if (failures.token !== null) {
        throw failures.token;
      }

      if (elsewhere !== null) {
        login(elsewhere);
        elsewhere = null;
      }

      if (claims === undefined) {
        throw Object.assign(new Error("Login required"), {
          error: "login_required",
          error_description: "Login required",
        });
      }

      issued += 1;

      return {
        access_token: `access.${claims.sub}.${options.authorizationParams.audience ?? "default"}.${issued}`,
        token_type: "Bearer",
        id_token: "id-token",
        expires_in: 86400,
      };
    },
    logout: async (options: LogoutCall) => {
      logouts.push(options);
      claims = undefined;

      const returnTo = options.logoutParams?.returnTo;

      options.openUrl(
        `${AUTH0_ISSUER}v2/logout?client_id=anchor-client${returnTo === undefined ? "" : `&returnTo=${encodeURIComponent(returnTo)}`}`,
      );
    },
  } satisfies Auth0ClientLike;

  return {
    sdk,
    tokens,
    logouts,
    failures,
    claims: () => claims,
    login,
    loginInAnotherTab: (sub: string) => {
      elsewhere = sub;
    },
    logoutLocally: () => {
      claims = undefined;
    },
  };
};
