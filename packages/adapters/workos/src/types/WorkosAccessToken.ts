/**
 * A token profile that mints the AuthKit access token through
 * `getAccessToken()`, as `accessToken()` returns it.
 *
 * @example
 * ```ts
 * const tokens: Record<string, WorkosAccessToken> = { api: accessToken() };
 * ```
 */
export type WorkosAccessToken = { kind: "access-token" };
