/**
 * A token profile that mints an access token for one API through
 * `getTokenSilently`, as `accessToken()` returns it.
 *
 * @example
 * ```ts
 * const profile: Auth0AccessToken = accessToken({ audience: "https://api.example.com", scope: "read:projects" });
 * ```
 */
export type Auth0AccessToken = {
  kind: "access-token";
  /** The API identifier the token is for; the client's default audience when absent. */
  audience?: string;
  /** Space-separated scopes, as Auth0 writes them. */
  scope?: string;
};
