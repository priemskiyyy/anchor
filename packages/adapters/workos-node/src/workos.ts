import type { ServerSessionAdapter } from "@priemskiyyy/anchor-server";

import type { WorkosAdapterOptions } from "src/types/WorkosAdapterOptions";
import type { WorkosLike } from "src/types/WorkosLike";
import type { WorkosSessionUser } from "src/types/WorkosSessionUser";
import type { WorkosUserOf } from "src/types/WorkosUserOf";
import {
  DEFAULT_SESSION_COOKIE,
  WORKOS_ADAPTER_NAME,
} from "src/utils/constants/workos";
import { getServerSessionAnswer } from "src/utils/getServerSessionAnswer";
import { getWorkosSessionUser } from "src/utils/getWorkosSessionUser";

/**
 * Request-scoped WorkOS sessions for `getRequestSession()` from
 * `@priemskiyyy/anchor-server`, over the server's `@workos-inc/node` client:
 * each read authenticates the request's sealed session cookie, refreshes an
 * expired one and passes the new cookie on, and maps the session as the
 * client adapter maps the same user.
 *
 * @example
 * ```ts
 * const { state, headers } = await getRequestSession(request, { adapter: workos({ sdk, cookiePassword }) });
 * ```
 */
export function workos<TWorkos extends WorkosLike>(
  options: WorkosAdapterOptions<TWorkos, WorkosSessionUser> & {
    user?: undefined;
  },
): ServerSessionAdapter<WorkosSessionUser, TWorkos>;

export function workos<TWorkos extends WorkosLike, TUser>(
  options: WorkosAdapterOptions<TWorkos, TUser> & {
    user: (user: WorkosUserOf<TWorkos>) => TUser;
  },
): ServerSessionAdapter<TUser, TWorkos>;

// An overload pair resolves the user type from whether a mapper is given, as Silo's value does.
export function workos({
  sdk,
  cookiePassword,
  cookie = DEFAULT_SESSION_COOKIE,
  user = getWorkosSessionUser,
}: WorkosAdapterOptions<WorkosLike, unknown>): ServerSessionAdapter<
  unknown,
  WorkosLike
> {
  return {
    name: WORKOS_ADAPTER_NAME,
    native: sdk,
    read: (request) =>
      getServerSessionAnswer(sdk, request, { cookie, cookiePassword }, user),
  };
}
