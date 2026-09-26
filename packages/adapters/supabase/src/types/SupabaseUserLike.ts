/**
 * The parts of a Supabase `User` the adapter reads: its id and whether it is
 * anonymous.
 *
 * @example
 * ```ts
 * const user: SupabaseUserLike = session.user;
 * ```
 */
export type SupabaseUserLike = { id: string; is_anonymous?: boolean };
