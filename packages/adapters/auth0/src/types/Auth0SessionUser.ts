/**
 * The default user of an Auth0 session: a plain snapshot of the profile claims
 * of the ID token, under Auth0's names, with `null` for a claim it lacks.
 *
 * @example
 * ```ts
 * const name = state.status === "signed-in" ? state.session.user.name : null;
 * ```
 */
export type Auth0SessionUser = {
  sub: string | null;
  name: string | null;
  nickname: string | null;
  picture: string | null;
  email: string | null;
  email_verified: boolean | null;
};
