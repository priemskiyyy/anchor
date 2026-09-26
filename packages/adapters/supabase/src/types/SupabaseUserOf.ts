import type { SupabaseClientLike } from "src/types/SupabaseClientLike";

/**
 * The user type of a supabase-js client's sessions, which is the session's
 * user unless a mapper says otherwise.
 *
 * @example
 * ```ts
 * type User = SupabaseUserOf<typeof supabaseClient>;
 * ```
 */
export type SupabaseUserOf<TClient extends SupabaseClientLike> = NonNullable<
  Awaited<ReturnType<TClient["auth"]["getSession"]>>["data"]["session"]
>["user"];
