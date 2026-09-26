import type { SessionAdapter } from "@priemskiyyy/anchor";

import type { WorkosAccessToken } from "src/types/WorkosAccessToken";
import type { WorkosAdapterOptions } from "src/types/WorkosAdapterOptions";
import type { WorkosClientLike } from "src/types/WorkosClientLike";
import type { WorkosSessionUser } from "src/types/WorkosSessionUser";
import type { WorkosUserOf } from "src/types/WorkosUserOf";
import { WORKOS_ADAPTER_NAME } from "src/utils/constants/workos";
import { getCurrentUser } from "src/utils/getCurrentUser";
import { getSessionAccessToken } from "src/utils/getSessionAccessToken";
import { getSessionAnswer } from "src/utils/getSessionAnswer";
import { getWorkosSessionUser } from "src/utils/getWorkosSessionUser";
import { signOutSession } from "src/utils/signOutSession";

/**
 * WorkOS sessions for Anchor over the AuthKit client `createClient()`
 * returned: the refreshes its callbacks report mark every sign-in,
 * organization switch and refresh failure, each token profile mints its
 * access token, and ending signs out without leaving the page.
 *
 * @example
 * ```ts
 * const refreshes = workosRefreshes();
 * const client = await createClient(clientId, {
 *   onRefresh: refreshes.handleRefresh,
 *   onRefreshFailure: refreshes.handleRefreshFailure,
 * });
 * const anchor = new Anchor({
 *   adapter: workos({ sdk: client, refreshes, tokens: { api: accessToken() } }),
 * });
 * ```
 */
export function workos<
  TClient extends WorkosClientLike,
  TTokens extends Record<string, WorkosAccessToken> = Record<
    never,
    WorkosAccessToken
  >,
>(
  options: WorkosAdapterOptions<TClient, WorkosSessionUser, TTokens> & {
    user?: undefined;
  },
): SessionAdapter<WorkosSessionUser, TClient, Extract<keyof TTokens, string>>;

export function workos<
  TClient extends WorkosClientLike,
  TUser,
  TTokens extends Record<string, WorkosAccessToken> = Record<
    never,
    WorkosAccessToken
  >,
>(
  options: WorkosAdapterOptions<TClient, TUser, TTokens> & {
    user: (user: WorkosUserOf<TClient>) => TUser;
  },
): SessionAdapter<TUser, TClient, Extract<keyof TTokens, string>>;

// An overload pair resolves the user type from whether a mapper is given, as Silo's value does.
export function workos({
  sdk,
  refreshes,
  user = getWorkosSessionUser,
  tokens = {},
}: WorkosAdapterOptions<
  WorkosClientLike,
  unknown,
  Record<string, WorkosAccessToken>
>): SessionAdapter<unknown, WorkosClientLike, string> {
  return {
    name: WORKOS_ADAPTER_NAME,
    native: sdk,
    tokens,
    open: (observer) => {
      const unsubscribe = refreshes.subscribe(() => observer.invalidate());

      return {
        read: async () =>
          getSessionAnswer(
            await getCurrentUser(sdk),
            refreshes.getLatestRefresh(),
            user,
          ),
        getToken: (request) => getSessionAccessToken(sdk, refreshes, request),
        end: (request) => signOutSession(sdk, refreshes, request),
        dispose: unsubscribe,
      };
    },
  };
}
