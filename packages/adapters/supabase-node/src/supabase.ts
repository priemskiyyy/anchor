import type { ServerSessionAdapter } from "@priemskiyyy/anchor-server";

import type { SupabaseAdapterOptions } from "src/types/SupabaseAdapterOptions";
import type { SupabaseCookieMethods } from "src/types/SupabaseCookieMethods";
import type { SupabaseServerClientLike } from "src/types/SupabaseServerClientLike";
import type { SupabaseUserOf } from "src/types/SupabaseUserOf";
import { SUPABASE_ADAPTER_NAME } from "src/utils/constants/supabase";
import { getServerSessionAnswer } from "src/utils/getServerSessionAnswer";

const keepSupabaseUser = <TUser>(user: TUser) => user;

/**
 * Request-scoped Supabase Auth sessions for `getRequestSession()` from
 * `@priemskiyyy/anchor-server`: each read creates a `@supabase/ssr` server
 * client over the request's own cookies, verifies its session with
 * `auth.getUser()`, and sets the cookies Supabase refreshes or deletes on the
 * response's headers. It maps a session exactly as the client adapter does.
 *
 * @example
 * ```ts
 * const adapter = supabase({ sdk: (cookies) => createServerClient(url, anonKey, { cookies }) });
 * const { state, headers } = await getRequestSession(request, { adapter });
 * ```
 */
export function supabase<TClient extends SupabaseServerClientLike>(
  options: SupabaseAdapterOptions<TClient, SupabaseUserOf<TClient>> & {
    user?: undefined;
  },
): ServerSessionAdapter<
  SupabaseUserOf<TClient>,
  (cookies: SupabaseCookieMethods) => TClient
>;

export function supabase<TClient extends SupabaseServerClientLike, TUser>(
  options: SupabaseAdapterOptions<TClient, TUser> & {
    user: (user: SupabaseUserOf<TClient>) => TUser;
  },
): ServerSessionAdapter<TUser, (cookies: SupabaseCookieMethods) => TClient>;

// An overload pair resolves the user type from whether a mapper is given, as Silo's value does.
export function supabase({
  sdk,
  user = keepSupabaseUser,
}: SupabaseAdapterOptions<
  SupabaseServerClientLike,
  unknown
>): ServerSessionAdapter<
  unknown,
  (cookies: SupabaseCookieMethods) => SupabaseServerClientLike
> {
  return {
    name: SUPABASE_ADAPTER_NAME,
    native: sdk,
    read: (request) => getServerSessionAnswer(sdk, request, user),
  };
}
