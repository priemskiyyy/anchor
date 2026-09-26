import { AnchorError } from "@priemskiyyy/anchor";
import type { SessionAdapter } from "@priemskiyyy/anchor";

import type { KeycloakAccessToken } from "src/types/KeycloakAccessToken";
import type { KeycloakAdapterOptions } from "src/types/KeycloakAdapterOptions";
import type { KeycloakClaimsOf } from "src/types/KeycloakClaimsOf";
import type { KeycloakLike } from "src/types/KeycloakLike";
import type { KeycloakSessionUser } from "src/types/KeycloakSessionUser";
import { KEYCLOAK_ADAPTER_NAME } from "src/utils/constants/keycloak";
import { chainKeycloakCallback } from "src/utils/chainKeycloakCallback";
import { getKeycloakSessionUser } from "src/utils/getKeycloakSessionUser";
import { getSessionAccessToken } from "src/utils/getSessionAccessToken";
import { getSessionAnswer } from "src/utils/getSessionAnswer";
import { pushSessionAnswer } from "src/utils/pushSessionAnswer";
import { signOutSession } from "src/utils/signOutSession";

/**
 * Keycloak sessions for Anchor over the keycloak-js instance your application
 * created: the callbacks you assigned stay chained while Anchor hears every
 * login, refresh and logout, each token profile mints the access token, and
 * ending hands back Keycloak's logout page. The first read waits for `init()`.
 *
 * @example
 * ```ts
 * const anchor = new Anchor({
 *   adapter: keycloak({ sdk: keycloakInstance, tokens: { api: accessToken() } }),
 * });
 * ```
 */
export function keycloak<
  TKeycloak extends KeycloakLike,
  TTokens extends Record<string, KeycloakAccessToken> = Record<
    never,
    KeycloakAccessToken
  >,
>(
  options: KeycloakAdapterOptions<TKeycloak, KeycloakSessionUser, TTokens> & {
    user?: undefined;
  },
): SessionAdapter<
  KeycloakSessionUser,
  TKeycloak,
  Extract<keyof TTokens, string>
>;

export function keycloak<
  TKeycloak extends KeycloakLike,
  TUser,
  TTokens extends Record<string, KeycloakAccessToken> = Record<
    never,
    KeycloakAccessToken
  >,
>(
  options: KeycloakAdapterOptions<TKeycloak, TUser, TTokens> & {
    user: (claims: KeycloakClaimsOf<TKeycloak>) => TUser;
  },
): SessionAdapter<TUser, TKeycloak, Extract<keyof TTokens, string>>;

// An overload pair resolves the user type from whether a mapper is given, as Silo's value does.
export function keycloak({
  sdk,
  initialized,
  user = getKeycloakSessionUser,
  tokens = {},
}: KeycloakAdapterOptions<
  KeycloakLike,
  unknown,
  Record<string, KeycloakAccessToken>
>): SessionAdapter<unknown, KeycloakLike, string> {
  return {
    name: KEYCLOAK_ADAPTER_NAME,
    native: sdk,
    tokens,
    open: (observer) => {
      // keycloak-js tells an init() still running from a finished one only through the promise init() returned.
      if (initialized === undefined && sdk.didInitialize) {
        throw new AnchorError({
          code: "INVALID_CONFIGURATION",
          message:
            "keycloak-js's init() was already called: pass the promise it returned as `initialized`.",
        });
      }

      let markReady = () => {};

      const readied = new Promise<void>((resolve) => {
        markReady = resolve;
      });

      const handleSessionChange = () =>
        pushSessionAnswer(observer, () =>
          getSessionAnswer(sdk.tokenParsed, user),
        );

      const restores = [
        chainKeycloakCallback(sdk, "onReady", () => markReady()),
        chainKeycloakCallback(sdk, "onAuthSuccess", handleSessionChange),
        chainKeycloakCallback(sdk, "onAuthRefreshSuccess", handleSessionChange),
        chainKeycloakCallback(sdk, "onAuthLogout", handleSessionChange),
      ];

      return {
        read: async () => {
          await (initialized ?? readied);

          return getSessionAnswer(sdk.tokenParsed, user);
        },
        getToken: (request) => getSessionAccessToken(sdk, request),
        end: (request) => signOutSession(sdk, request),
        dispose: () => {
          for (const restore of restores) {
            restore();
          }
        },
      };
    },
  };
}
