import type { SupabaseUserLike } from "src/types/SupabaseUserLike";

/**
 * The parts of a Supabase `Session` the adapter reads: the access token, its
 * type and the user.
 *
 * @example
 * ```ts
 * const { data } = await supabase.auth.getSession();
 * const session: SupabaseSessionLike | null = data.session;
 * ```
 */
export type SupabaseSessionLike = {
  access_token: string;
  token_type: string;
  user: SupabaseUserLike;
};
