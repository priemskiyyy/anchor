import type { SupabaseCookieMethods } from "src/types/SupabaseCookieMethods";
import type { SupabaseServerClientLike } from "src/types/SupabaseServerClientLike";
import type { SupabaseUserOf } from "src/types/SupabaseUserOf";

/**
 * Options of `supabase()` from `@priemskiyyy/anchor-supabase-node`: how to
 * create a request's server client from the cookie methods the adapter gives
 * it, and an optional mapper from the Supabase user to the plain data a
 * session carries.
 *
 * @example
 * ```ts
 * const options: SupabaseAdapterOptions<SupabaseClient, { id: string }> = {
 *   sdk: (cookies) => createServerClient(url, anonKey, { cookies }),
 *   user: (user) => ({ id: user.id }),
 * };
 * ```
 */
export type SupabaseAdapterOptions<
  TClient extends SupabaseServerClientLike,
  TUser,
> = {
  /** Creates one request's server client from the adapter's cookie methods, as `(cookies) => createServerClient(url, anonKey, { cookies })`. */
  sdk: (cookies: SupabaseCookieMethods) => TClient;
  /** Maps the Supabase user to the plain data a session carries; the user itself by default, as the client adapter keeps it. */
  user?: (user: SupabaseUserOf<TClient>) => TUser;
};
