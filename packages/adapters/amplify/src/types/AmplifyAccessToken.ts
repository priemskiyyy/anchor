/**
 * A token profile that mints the Cognito access token of Amplify's auth
 * session, as `accessToken()` returns it.
 *
 * @example
 * ```ts
 * const tokens: Record<string, AmplifyAccessToken> = { api: accessToken() };
 * ```
 */
export type AmplifyAccessToken = { kind: "access-token" };
