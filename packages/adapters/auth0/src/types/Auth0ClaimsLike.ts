/**
 * The ID token claims the adapter reads: the issuer and subject that name the
 * principal, the session and organization that fingerprint its context, the
 * actor of an impersonation, and the profile fields of the default user.
 *
 * @example
 * ```ts
 * const claims: Auth0ClaimsLike | undefined = await auth0Client.getIdTokenClaims();
 * ```
 */
export type Auth0ClaimsLike = {
  iss?: string;
  sub?: string;
  sid?: string;
  org_id?: string;
  act?: unknown;
  name?: string;
  nickname?: string;
  picture?: string;
  email?: string;
  email_verified?: boolean;
};
