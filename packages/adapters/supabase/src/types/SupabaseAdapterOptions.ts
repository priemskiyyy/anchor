import type { SupabaseAccessToken } from "src/types/SupabaseAccessToken";
import type { SupabaseClientLike } from "src/types/SupabaseClientLike";
import type { SupabaseUserOf } from "src/types/SupabaseUserOf";

/**
 * Options of `supabase()`: the application's supabase-js client, an optional
 * mapper from the Supabase user to the plain data a session carries, and the
 * token profiles the adapter mints.
 *
 * @example
 * ```ts
 * const options: SupabaseAdapterOptions<SupabaseClient, { id: string }, { api: SupabaseAccessToken }> = {
 *   sdk: supabaseClient,
 *   user: (user) => ({ id: user.id }),
 *   tokens: { api: accessToken() },
 * };
 * ```
 */
export type SupabaseAdapterOptions<
  TClient extends SupabaseClientLike,
  TUser,
  TTokens extends Record<string, SupabaseAccessToken>,
> = {
  sdk: TClient;
  /** Maps the Supabase user to the plain data a session carries; the session's user itself by default. */
  user?: (user: SupabaseUserOf<TClient>) => TUser;
  tokens?: TTokens;
};
