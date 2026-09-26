import type { OidcProfileLike } from "src/types/OidcProfileLike";

/**
 * The parts of an oidc-client-ts `User` the adapter reads: the access token
 * and its type, the ID token that ends the provider's session, whether the
 * access token has expired, and the ID token claims.
 *
 * @example
 * ```ts
 * const user: OidcUserLike | null = await userManager.getUser();
 * ```
 */
export type OidcUserLike = {
  access_token: string;
  /** The token type the provider answered, such as `Bearer` or `DPoP`. */
  token_type: string;
  id_token?: string | undefined;
  /** Whether the access token has expired, or `undefined` when the provider answered no lifetime. */
  expired?: boolean | undefined;
  profile: OidcProfileLike;
};
