import type { OktaAccessToken } from "src/types/OktaAccessToken";
import type { OktaAuthLike } from "src/types/OktaAuthLike";
import type { OktaClaimsOf } from "src/types/OktaClaimsOf";

/**
 * Options of `okta()`: the application's `OktaAuth` instance, an optional
 * mapper from the ID token claims to the plain data a session carries, and
 * the token profiles the adapter mints.
 *
 * @example
 * ```ts
 * const options: OktaAdapterOptions<OktaAuth, { id: string }, { api: OktaAccessToken }> = {
 *   sdk: oktaAuth,
 *   user: (claims) => ({ id: claims.sub }),
 *   tokens: { api: accessToken() },
 * };
 * ```
 */
export type OktaAdapterOptions<
  TAuth extends OktaAuthLike,
  TUser,
  TTokens extends Record<string, OktaAccessToken>,
> = {
  sdk: TAuth;
  /** Maps the ID token claims to the plain data a session carries; a snapshot of the profile claims by default. */
  user?: (claims: OktaClaimsOf<TAuth>) => TUser;
  tokens?: TTokens;
};
