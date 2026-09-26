import type { SessionAdapter } from "@priemskiyyy/anchor";

import type { MsalAccessToken } from "src/types/MsalAccessToken";
import type { MsalAccountOf } from "src/types/MsalAccountOf";
import type { MsalAdapterOptions } from "src/types/MsalAdapterOptions";
import type { MsalLike } from "src/types/MsalLike";
import type { MsalSessionUser } from "src/types/MsalSessionUser";
import {
  MSAL_ADAPTER_NAME,
  SESSION_EVENT_TYPES,
} from "src/utils/constants/msal";
import { getMsalSessionUser } from "src/utils/getMsalSessionUser";
import { getSessionAccessToken } from "src/utils/getSessionAccessToken";
import { getSessionAnswer } from "src/utils/getSessionAnswer";
import { signOutSession } from "src/utils/signOutSession";

/**
 * Microsoft Entra ID sessions for Anchor over the MSAL.js
 * `PublicClientApplication` your application created: the active account you
 * chose is the session, MSAL's events ask for a read, each token profile mints
 * an access token for its scopes and that account, and ending clears only
 * that account. The first read waits for `initialized`.
 *
 * @example
 * ```ts
 * const anchor = new Anchor({
 *   adapter: msal({
 *     sdk: msalInstance,
 *     initialized: msalInstance.initialize(),
 *     tokens: { graph: accessToken({ scopes: ["User.Read"] }) },
 *   }),
 * });
 * ```
 */
export function msal<
  TClient extends MsalLike,
  TTokens extends Record<string, MsalAccessToken> = Record<
    never,
    MsalAccessToken
  >,
>(
  options: MsalAdapterOptions<TClient, MsalSessionUser, TTokens> & {
    user?: undefined;
  },
): SessionAdapter<MsalSessionUser, TClient, Extract<keyof TTokens, string>>;

export function msal<
  TClient extends MsalLike,
  TUser,
  TTokens extends Record<string, MsalAccessToken> = Record<
    never,
    MsalAccessToken
  >,
>(
  options: MsalAdapterOptions<TClient, TUser, TTokens> & {
    user: (account: MsalAccountOf<TClient>) => TUser;
  },
): SessionAdapter<TUser, TClient, Extract<keyof TTokens, string>>;

// An overload pair resolves the user type from whether a mapper is given, as Silo's value does.
export function msal({
  sdk,
  initialized,
  user = getMsalSessionUser,
  tokens = {},
}: MsalAdapterOptions<
  MsalLike,
  unknown,
  Record<string, MsalAccessToken>
>): SessionAdapter<unknown, MsalLike, string> {
  return {
    name: MSAL_ADAPTER_NAME,
    native: sdk,
    tokens,
    open: (observer) => {
      const callbackId = sdk.addEventCallback(
        () => observer.invalidate(),
        [...SESSION_EVENT_TYPES],
      );

      return {
        read: async () => {
          await initialized;

          return getSessionAnswer(sdk.getActiveAccount(), user);
        },
        getToken: (request) => getSessionAccessToken(sdk, tokens, request),
        end: (request) => signOutSession(sdk, request),
        dispose: () => {
          if (callbackId === null) {
            return;
          }

          sdk.removeEventCallback(callbackId);
        },
      };
    },
  };
}
