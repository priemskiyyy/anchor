import type { SessionAdapter } from "@priemskiyyy/anchor";

import type { OktaAccessToken } from "src/types/OktaAccessToken";
import type { OktaAdapterOptions } from "src/types/OktaAdapterOptions";
import type { OktaAuthLike } from "src/types/OktaAuthLike";
import type { OktaAuthStateLike } from "src/types/OktaAuthStateLike";
import type { OktaClaimsOf } from "src/types/OktaClaimsOf";
import type { OktaSessionUser } from "src/types/OktaSessionUser";
import { OKTA_ADAPTER_NAME } from "src/utils/constants/okta";
import { getOktaSessionUser } from "src/utils/getOktaSessionUser";
import { getSessionAccessToken } from "src/utils/getSessionAccessToken";
import { getSessionAnswer } from "src/utils/getSessionAnswer";
import { pushSessionAnswer } from "src/utils/pushSessionAnswer";
import { signOutSession } from "src/utils/signOutSession";

/**
 * Okta sessions for Anchor over the okta-auth-js `OktaAuth` instance your
 * application created: the auth state manager reports every change, each
 * token profile mints the token manager's access token, and ending revokes
 * the tokens, clears them and hands back Okta's sign-out page.
 *
 * @example
 * ```ts
 * const anchor = new Anchor({
 *   adapter: okta({ sdk: oktaAuth, tokens: { api: accessToken() } }),
 * });
 * ```
 */
export function okta<
  TAuth extends OktaAuthLike,
  TTokens extends Record<string, OktaAccessToken> = Record<
    never,
    OktaAccessToken
  >,
>(
  options: OktaAdapterOptions<TAuth, OktaSessionUser, TTokens> & {
    user?: undefined;
  },
): SessionAdapter<OktaSessionUser, TAuth, Extract<keyof TTokens, string>>;

export function okta<
  TAuth extends OktaAuthLike,
  TUser,
  TTokens extends Record<string, OktaAccessToken> = Record<
    never,
    OktaAccessToken
  >,
>(
  options: OktaAdapterOptions<TAuth, TUser, TTokens> & {
    user: (claims: OktaClaimsOf<TAuth>) => TUser;
  },
): SessionAdapter<TUser, TAuth, Extract<keyof TTokens, string>>;

// An overload pair resolves the user type from whether a mapper is given, as Silo's value does.
export function okta({
  sdk,
  user = getOktaSessionUser,
  tokens = {},
}: OktaAdapterOptions<
  OktaAuthLike,
  unknown,
  Record<string, OktaAccessToken>
>): SessionAdapter<unknown, OktaAuthLike, string> {
  return {
    name: OKTA_ADAPTER_NAME,
    native: sdk,
    tokens,
    open: (observer) => {
      const handleAuthStateChange = (authState: OktaAuthStateLike) =>
        pushSessionAnswer(observer, () => getSessionAnswer(authState, user));

      sdk.authStateManager.subscribe(handleAuthStateChange);

      return {
        read: async () =>
          getSessionAnswer(await sdk.authStateManager.updateAuthState(), user),
        getToken: (request) => getSessionAccessToken(sdk, request),
        end: (request) => signOutSession(sdk, request),
        dispose: () => sdk.authStateManager.unsubscribe(handleAuthStateChange),
      };
    },
  };
}
