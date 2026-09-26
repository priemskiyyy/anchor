/**
 * A token profile that mints an access token through the credentials
 * manager, for one API when it names an audience, as `accessToken()` returns
 * it.
 *
 * @example
 * ```ts
 * const profile: Auth0AccessToken = accessToken({ audience: "https://api.example.com", scope: "read:projects" });
 * ```
 */
export type Auth0AccessToken = {
  kind: "access-token";
  /** The API identifier the token is for, minted through `getApiCredentials`; the login's own access token when absent. */
  audience?: string;
  /** Space-separated scopes, as Auth0 writes them. */
  scope?: string;
};
