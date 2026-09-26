import type { SessionAdapter } from "@priemskiyyy/anchor";

import type { Auth0AccessToken } from "src/types/Auth0AccessToken";
import type { Auth0AdapterOptions } from "src/types/Auth0AdapterOptions";
import type { Auth0IdTokenParserLike } from "src/types/Auth0IdTokenParserLike";
import type { Auth0Like } from "src/types/Auth0Like";
import type { Auth0SessionUser } from "src/types/Auth0SessionUser";
import type { Auth0UserOf } from "src/types/Auth0UserOf";
import { AUTH0_ADAPTER_NAME } from "src/utils/constants/auth0";
import { ApiCredentialsCaches } from "src/utils/ApiCredentialsCaches";
import { getAuth0SessionUser } from "src/utils/getAuth0SessionUser";
import { getLoginKey } from "src/utils/getLoginKey";
import { getSessionAccessToken } from "src/utils/getSessionAccessToken";
import { getSessionAnswer } from "src/utils/getSessionAnswer";
import { getSessionContext } from "src/utils/getSessionContext";
import { getStoredUser } from "src/utils/getStoredUser";
import { signOutSession } from "src/utils/signOutSession";

/**
 * Auth0 sessions for Anchor on React Native, over the react-native-auth0
 * client your application created: the credentials manager holds the
 * session, each token profile mints an access token through it, and ending
 * clears it on the device. The client emits no events, so call
 * `anchor.sync()` after a login.
 *
 * @example
 * ```ts
 * const anchor = new Anchor({
 *   adapter: auth0({
 *     sdk: client,
 *     domain: "acme.us.auth0.com",
 *     parseIdToken,
 *     tokens: { api: accessToken({ audience: "https://api.example.com" }) },
 *   }),
 * });
 * ```
 */
export function auth0<
  TClient extends Auth0Like,
  TParse extends Auth0IdTokenParserLike,
  TTokens extends Record<string, Auth0AccessToken> = Record<
    never,
    Auth0AccessToken
  >,
>(
  options: Auth0AdapterOptions<TClient, TParse, Auth0SessionUser, TTokens> & {
    user?: undefined;
  },
): SessionAdapter<Auth0SessionUser, TClient, Extract<keyof TTokens, string>>;

export function auth0<
  TClient extends Auth0Like,
  TParse extends Auth0IdTokenParserLike,
  TUser,
  TTokens extends Record<string, Auth0AccessToken> = Record<
    never,
    Auth0AccessToken
  >,
>(
  options: Auth0AdapterOptions<TClient, TParse, TUser, TTokens> & {
    user: (user: Auth0UserOf<TParse>) => TUser;
  },
): SessionAdapter<TUser, TClient, Extract<keyof TTokens, string>>;

// An overload pair resolves the user type from whether a mapper is given, as Silo's value does.
export function auth0({
  sdk,
  domain,
  parseIdToken,
  user = getAuth0SessionUser,
  tokens = {},
}: Auth0AdapterOptions<
  Auth0Like,
  Auth0IdTokenParserLike,
  unknown,
  Record<string, Auth0AccessToken>
>): SessionAdapter<unknown, Auth0Like, string> {
  const authority = `https://${domain}/`;

  return {
    name: AUTH0_ADAPTER_NAME,
    native: sdk,
    tokens,
    open: () => {
      const caches = new ApiCredentialsCaches();

      return {
        read: async () => {
          const stored = await getStoredUser(sdk, parseIdToken);

          caches.noteLogin(
            stored === null
              ? null
              : getLoginKey(stored.sub, getSessionContext(stored)),
          );

          return getSessionAnswer(stored, authority, user);
        },
        getToken: (request) =>
          getSessionAccessToken(sdk, parseIdToken, caches, tokens, request),
        end: (request) => signOutSession(sdk, parseIdToken, tokens, request),
      };
    },
  };
}
