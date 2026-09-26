import type { SupabaseServerClientLike } from "src/types/SupabaseServerClientLike";

/**
 * The user type of a Supabase server client, the `User` its
 * `auth.getUser()` answers, which a `user` mapper receives.
 *
 * @example
 * ```ts
 * type User = SupabaseUserOf<SupabaseClient>;
 * ```
 */
export type SupabaseUserOf<TClient extends SupabaseServerClientLike> =
  NonNullable<Awaited<ReturnType<TClient["auth"]["getUser"]>>["data"]["user"]>;
