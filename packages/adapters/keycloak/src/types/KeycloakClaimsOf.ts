import type { KeycloakLike } from "src/types/KeycloakLike";

/**
 * The access token claims type of a keycloak-js instance, which a `user`
 * mapper receives.
 *
 * @example
 * ```ts
 * type Claims = KeycloakClaimsOf<Keycloak>;
 * ```
 */
export type KeycloakClaimsOf<TKeycloak extends KeycloakLike> = NonNullable<
  TKeycloak["tokenParsed"]
>;
