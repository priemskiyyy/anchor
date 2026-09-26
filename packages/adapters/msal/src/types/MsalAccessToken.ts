/**
 * A token profile that mints an access token for one set of scopes through
 * `acquireTokenSilent`, as `accessToken()` returns it.
 *
 * @example
 * ```ts
 * const profile: MsalAccessToken = accessToken({ scopes: ["User.Read"] });
 * ```
 */
export type MsalAccessToken = {
  kind: "access-token";
  /** The scopes the token is for, as MSAL requests them, such as `User.Read` or `api://my-api/read`. */
  scopes: string[];
};
