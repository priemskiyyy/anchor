/**
 * The access token claims the adapter reads from `tokenParsed`: the issuer
 * and subject that name the principal, the Keycloak session and organization
 * that fingerprint its context, and the profile fields of the default user.
 *
 * @example
 * ```ts
 * const claims: KeycloakTokenParsedLike | undefined = keycloak.tokenParsed;
 * ```
 */
export type KeycloakTokenParsedLike = {
  iss?: string;
  sub?: string;
  sid?: string;
  /** The user's organizations, as the `organization` client scope of Keycloak 26 adds them. */
  organization?: unknown;
  name?: string;
  preferred_username?: string;
  given_name?: string;
  family_name?: string;
  email?: string;
  email_verified?: boolean;
};
