import type { Auth0AccessToken } from "src/types/Auth0AccessToken";
import type { Auth0ClaimsOf } from "src/types/Auth0ClaimsOf";
import type { Auth0ClientLike } from "src/types/Auth0ClientLike";

/**
 * Options of `auth0()`: the application's auth0-spa-js client, an optional
 * mapper from the ID token claims to the plain data a session carries, the
 * token profiles, and where Auth0's logout page returns to.
 *
 * @example
 * ```ts
 * const options: Auth0AdapterOptions<Auth0Client, { id: string }, { api: Auth0AccessToken }> = {
 *   sdk: auth0Client,
 *   user: (claims) => ({ id: String(claims.sub) }),
 *   tokens: { api: accessToken({ audience: "https://api.example.com" }) },
 *   returnTo: "https://app.example.com",
 * };
 * ```
 */
export type Auth0AdapterOptions<
  TClient extends Auth0ClientLike,
  TUser,
  TTokens extends Record<string, Auth0AccessToken>,
> = {
  sdk: TClient;
  /** Maps the ID token claims to the plain data a session carries; a snapshot of the profile claims by default. */
  user?: (claims: Auth0ClaimsOf<TClient>) => TUser;
  tokens?: TTokens;
  /** The page Auth0's logout endpoint sends the browser back to; one of the application's Allowed Logout URLs. */
  returnTo?: string;
};
