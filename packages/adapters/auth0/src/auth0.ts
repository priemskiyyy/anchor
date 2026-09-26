import type { SessionAdapter } from "@priemskiyyy/anchor";

import type { Auth0AccessToken } from "src/types/Auth0AccessToken";
import type { Auth0AdapterOptions } from "src/types/Auth0AdapterOptions";
import type { Auth0ClaimsOf } from "src/types/Auth0ClaimsOf";
import type { Auth0ClientLike } from "src/types/Auth0ClientLike";
import type { Auth0SessionUser } from "src/types/Auth0SessionUser";
import { AUTH0_ADAPTER_NAME } from "src/utils/constants/auth0";
import { getAuth0SessionUser } from "src/utils/getAuth0SessionUser";
import { getSessionAccessToken } from "src/utils/getSessionAccessToken";
import { getSessionAnswer } from "src/utils/getSessionAnswer";
import { signOutSession } from "src/utils/signOutSession";

/**
 * Auth0 sessions for Anchor over the auth0-spa-js client your application
 * created: the cached ID token names the session, each token profile mints an
 * access token for its audience, and ending hands back Auth0's logout page.
 * The client emits no events, so call `anchor.sync()` after a login.
 *
 * @example
 * ```ts
 * const anchor = new Anchor({
 *   adapter: auth0({
 *     sdk: auth0Client,
 *     tokens: { api: accessToken({ audience: "https://api.example.com" }) },
 *   }),
 * });
 * ```
 */
export function auth0<
  TClient extends Auth0ClientLike,
  TTokens extends Record<string, Auth0AccessToken> = Record<
    never,
    Auth0AccessToken
  >,
>(
  options: Auth0AdapterOptions<TClient, Auth0SessionUser, TTokens> & {
    user?: undefined;
  },
): SessionAdapter<Auth0SessionUser, TClient, Extract<keyof TTokens, string>>;

export function auth0<
  TClient extends Auth0ClientLike,
  TUser,
  TTokens extends Record<string, Auth0AccessToken> = Record<
    never,
    Auth0AccessToken
  >,
>(
  options: Auth0AdapterOptions<TClient, TUser, TTokens> & {
    user: (claims: Auth0ClaimsOf<TClient>) => TUser;
  },
): SessionAdapter<TUser, TClient, Extract<keyof TTokens, string>>;

// An overload pair resolves the user type from whether a mapper is given, as Silo's value does.
export function auth0({
  sdk,
  user = getAuth0SessionUser,
  tokens = {},
  returnTo,
}: Auth0AdapterOptions<
  Auth0ClientLike,
  unknown,
  Record<string, Auth0AccessToken>
>): SessionAdapter<unknown, Auth0ClientLike, string> {
  return {
    name: AUTH0_ADAPTER_NAME,
    native: sdk,
    tokens,
    open: () => ({
      read: async () => getSessionAnswer(await sdk.getIdTokenClaims(), user),
      getToken: (request) => getSessionAccessToken(sdk, tokens, request),
      end: (request) => signOutSession(sdk, returnTo, request),
    }),
  };
}
