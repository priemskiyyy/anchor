/**
 * A token profile that mints the session's own token, which your API accepts as
 * a bearer token through Better Auth's `bearer()` server plugin, as
 * `sessionToken()` returns it.
 *
 * @example
 * ```ts
 * const tokens: Record<string, BetterAuthSessionToken> = { api: sessionToken() };
 * ```
 */
export type BetterAuthSessionToken = { kind: "session-token" };
