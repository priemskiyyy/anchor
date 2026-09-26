import type { Auth0ClientLike } from "src/types/Auth0ClientLike";

/**
 * The ID token claims type of an auth0-spa-js client, which a `user` mapper
 * receives.
 *
 * @example
 * ```ts
 * type Claims = Auth0ClaimsOf<Auth0Client>;
 * ```
 */
export type Auth0ClaimsOf<TClient extends Auth0ClientLike> = NonNullable<
  Awaited<ReturnType<TClient["getIdTokenClaims"]>>
>;
