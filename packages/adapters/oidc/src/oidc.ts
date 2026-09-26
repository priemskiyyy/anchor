import type { SessionAdapter } from "@priemskiyyy/anchor";

import type { OidcAccessToken } from "src/types/OidcAccessToken";
import type { OidcAdapterOptions } from "src/types/OidcAdapterOptions";
import type { OidcProfileOf } from "src/types/OidcProfileOf";
import type { OidcSessionUser } from "src/types/OidcSessionUser";
import type { OidcUserManagerLike } from "src/types/OidcUserManagerLike";
import { SIGNED_OUT_ANSWER } from "src/utils/constants/answers";
import { OIDC_ADAPTER_NAME } from "src/utils/constants/oidc";
import { getOidcSessionUser } from "src/utils/getOidcSessionUser";
import { getSessionAccessToken } from "src/utils/getSessionAccessToken";
import { getSessionAnswer } from "src/utils/getSessionAnswer";
import { pushSessionAnswer } from "src/utils/pushSessionAnswer";
import { signOutSession } from "src/utils/signOutSession";

/**
 * OpenID Connect sessions for Anchor over the oidc-client-ts `UserManager`
 * your application configured, for Okta, Keycloak, Zitadel, Authentik,
 * Cognito's hosted UI, Entra or any other provider: its user events report
 * every change, each token profile mints the user's access token, and ending
 * hands back the provider's end-session page.
 *
 * @example
 * ```ts
 * const anchor = new Anchor({
 *   adapter: oidc({ sdk: userManager, tokens: { api: accessToken() } }),
 * });
 * ```
 */
export function oidc<
  TManager extends OidcUserManagerLike,
  TTokens extends Record<string, OidcAccessToken> = Record<
    never,
    OidcAccessToken
  >,
>(
  options: OidcAdapterOptions<TManager, OidcSessionUser, TTokens> & {
    user?: undefined;
  },
): SessionAdapter<OidcSessionUser, TManager, Extract<keyof TTokens, string>>;

export function oidc<
  TManager extends OidcUserManagerLike,
  TUser,
  TTokens extends Record<string, OidcAccessToken> = Record<
    never,
    OidcAccessToken
  >,
>(
  options: OidcAdapterOptions<TManager, TUser, TTokens> & {
    user: (profile: OidcProfileOf<TManager>) => TUser;
  },
): SessionAdapter<TUser, TManager, Extract<keyof TTokens, string>>;

// An overload pair resolves the user type from whether a mapper is given, as Silo's value does.
export function oidc({
  sdk,
  user = getOidcSessionUser,
  tokens = {},
}: OidcAdapterOptions<
  OidcUserManagerLike,
  unknown,
  Record<string, OidcAccessToken>
>): SessionAdapter<unknown, OidcUserManagerLike, string> {
  return {
    name: OIDC_ADAPTER_NAME,
    native: sdk,
    tokens,
    open: (observer) => {
      const removals = [
        sdk.events.addUserLoaded((loaded) =>
          pushSessionAnswer(observer, () => getSessionAnswer(loaded, user)),
        ),
        sdk.events.addUserUnloaded(() => observer.session(SIGNED_OUT_ANSWER)),
        sdk.events.addUserSignedOut(() => observer.invalidate()),
      ];

      return {
        read: async () => getSessionAnswer(await sdk.getUser(), user),
        getToken: (request) => getSessionAccessToken(sdk, request),
        end: (request) => signOutSession(sdk, request),
        dispose: () => {
          for (const remove of removals) {
            remove();
          }
        },
      };
    },
  };
}
