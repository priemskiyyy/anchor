/**
 * A token profile that mints the user's access token, as `accessToken()`
 * returns it.
 *
 * @example
 * ```ts
 * const tokens: Record<string, OidcAccessToken> = { api: accessToken() };
 * ```
 */
export type OidcAccessToken = { kind: "access-token" };
