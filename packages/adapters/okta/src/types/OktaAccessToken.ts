/**
 * A token profile that mints the access token of the okta-auth-js token
 * manager, as `accessToken()` returns it.
 *
 * @example
 * ```ts
 * const tokens: Record<string, OktaAccessToken> = { api: accessToken() };
 * ```
 */
export type OktaAccessToken = { kind: "access-token" };
