/**
 * A token profile that mints the session's Supabase access token, as
 * `accessToken()` returns it.
 *
 * @example
 * ```ts
 * const tokens: Record<string, SupabaseAccessToken> = { api: accessToken() };
 * ```
 */
export type SupabaseAccessToken = { kind: "access-token" };
