import type { KeycloakAccessToken } from "src/types/KeycloakAccessToken";
import type { KeycloakClaimsOf } from "src/types/KeycloakClaimsOf";
import type { KeycloakLike } from "src/types/KeycloakLike";

/**
 * Options of `keycloak()`: the application's keycloak-js instance, the promise
 * its `init()` returned when Anchor may start while `init()` runs, an optional
 * mapper from the access token claims to the plain data a session carries,
 * and the token profiles the adapter mints.
 *
 * @example
 * ```ts
 * const options: KeycloakAdapterOptions<Keycloak, { id: string }, { api: KeycloakAccessToken }> = {
 *   sdk: keycloak,
 *   user: (claims) => ({ id: String(claims.sub) }),
 *   tokens: { api: accessToken() },
 * };
 * ```
 */
export type KeycloakAdapterOptions<
  TKeycloak extends KeycloakLike,
  TUser,
  TTokens extends Record<string, KeycloakAccessToken>,
> = {
  sdk: TKeycloak;
  /** The promise `init()` returned. Every read waits for it, so an Anchor started while `init()` runs is never signed out before keycloak-js found the session. */
  initialized?: PromiseLike<unknown>;
  /** Maps the access token claims of `tokenParsed` to the plain data a session carries; a snapshot of the profile claims by default. */
  user?: (claims: KeycloakClaimsOf<TKeycloak>) => TUser;
  tokens?: TTokens;
};
