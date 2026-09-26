/**
 * The default user of an Okta session: a plain snapshot of the profile claims
 * of the ID token, under Okta's names, with `null` for a claim it lacks.
 *
 * @example
 * ```ts
 * const email = state.status === "signed-in" ? state.session.user.email : null;
 * ```
 */
export type OktaSessionUser = {
  sub: string | null;
  name: string | null;
  preferred_username: string | null;
  given_name: string | null;
  family_name: string | null;
  email: string | null;
  email_verified: boolean | null;
};
