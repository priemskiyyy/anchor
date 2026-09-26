/**
 * The default user of an OpenID Connect session: a plain snapshot of the
 * profile claims of the ID token, under their OpenID Connect names, with
 * `null` for a claim it lacks.
 *
 * @example
 * ```ts
 * const name = state.status === "signed-in" ? state.session.user.name : null;
 * ```
 */
export type OidcSessionUser = {
  sub: string | null;
  name: string | null;
  given_name: string | null;
  family_name: string | null;
  preferred_username: string | null;
  email: string | null;
  email_verified: boolean | null;
  picture: string | null;
};
