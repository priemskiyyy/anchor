/**
 * The ID token claims the adapter reads from `user.profile`: the issuer and
 * subject that name the principal, the provider session, organization and
 * actor that fingerprint its context, and the profile fields of the default
 * user.
 *
 * @example
 * ```ts
 * const profile: OidcProfileLike | undefined = (await userManager.getUser())?.profile;
 * ```
 */
export type OidcProfileLike = {
  iss?: string;
  sub?: string;
  sid?: string;
  /** The organization, under the name Auth0 and others give it. */
  org_id?: unknown;
  /** The organization, under the name Keycloak gives it. */
  organization?: unknown;
  /** The actor of an impersonation or delegation, as RFC 8693 names it. */
  act?: unknown;
  name?: string;
  given_name?: string;
  family_name?: string;
  preferred_username?: string;
  email?: string;
  email_verified?: boolean;
  picture?: string;
};
