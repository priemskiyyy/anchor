import type { ServerSessionAdapter } from "@priemskiyyy/anchor-server";

import type { BetterAuthAdapterOptions } from "src/types/BetterAuthAdapterOptions";
import type { BetterAuthServerLike } from "src/types/BetterAuthServerLike";
import type { BetterAuthSessionUser } from "src/types/BetterAuthSessionUser";
import type { BetterAuthUserOf } from "src/types/BetterAuthUserOf";
import { BETTER_AUTH_ADAPTER_NAME } from "src/utils/constants/betterAuth";
import { getBetterAuthSessionUser } from "src/utils/getBetterAuthSessionUser";
import { getServerSessionAnswer } from "src/utils/getServerSessionAnswer";

/**
 * Request-scoped Better Auth sessions for `getRequestSession()` from
 * `@priemskiyyy/anchor-server`, over the server's `auth` instance: each read
 * answers from the request's own cookies, with the headers Better Auth wants
 * set, such as a refreshed session cookie. It maps a session exactly as the
 * client adapter does.
 *
 * @example
 * ```ts
 * const { state, headers } = await getRequestSession(request, { adapter: betterAuth({ sdk: auth }) });
 * ```
 */
export function betterAuth<TServer extends BetterAuthServerLike>(
  options: BetterAuthAdapterOptions<TServer, BetterAuthSessionUser> & {
    user?: undefined;
  },
): ServerSessionAdapter<BetterAuthSessionUser, TServer>;

export function betterAuth<TServer extends BetterAuthServerLike, TUser>(
  options: BetterAuthAdapterOptions<TServer, TUser> & {
    user: (user: BetterAuthUserOf<TServer>) => TUser;
  },
): ServerSessionAdapter<TUser, TServer>;

// An overload pair resolves the user type from whether a mapper is given, as Silo's value does.
export function betterAuth({
  sdk,
  user = getBetterAuthSessionUser,
}: BetterAuthAdapterOptions<
  BetterAuthServerLike,
  unknown
>): ServerSessionAdapter<unknown, BetterAuthServerLike> {
  return {
    name: BETTER_AUTH_ADAPTER_NAME,
    native: sdk,
    read: (request) => getServerSessionAnswer(sdk, request, user),
  };
}
