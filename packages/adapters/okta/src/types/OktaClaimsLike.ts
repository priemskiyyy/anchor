/**
 * The ID token claims the adapter reads: the issuer and subject that name the
 * principal, the Okta session that fingerprints its context, and the profile
 * fields of the default user.
 *
 * @example
 * ```ts
 * const claims: OktaClaimsLike | undefined = oktaAuth.tokenManager.getTokensSync().idToken?.claims;
 * ```
 */
export type OktaClaimsLike = {
  iss?: string;
  sub?: string;
  sid?: string;
  name?: string;
  preferred_username?: string;
  given_name?: string;
  family_name?: string;
  email?: string;
  email_verified?: boolean;
};
