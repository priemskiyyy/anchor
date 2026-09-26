/**
 * The parts of a Supabase `User` the adapter reads: its id and whether it is
 * anonymous.
 *
 * @example
 * ```ts
 * const { data } = await client.auth.getUser();
 * const user: SupabaseUserLike | null = data.user;
 * ```
 */
export type SupabaseUserLike = { id: string; is_anonymous?: boolean };
