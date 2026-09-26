/**
 * A token profile that mints the Keycloak access token, as `accessToken()`
 * returns it.
 *
 * @example
 * ```ts
 * const tokens: Record<string, KeycloakAccessToken> = { api: accessToken() };
 * ```
 */
export type KeycloakAccessToken = { kind: "access-token" };
