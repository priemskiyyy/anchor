/**
 * The default user of an Auth0 session: a plain snapshot of the profile
 * fields react-native-auth0's `parseIdToken` reads from the ID token, under
 * its names, with `null` for one it lacks.
 *
 * @example
 * ```ts
 * const name = state.status === "signed-in" ? state.session.user.name : null;
 * ```
 */
export type Auth0SessionUser = {
  sub: string;
  name: string | null;
  nickname: string | null;
  picture: string | null;
  email: string | null;
  emailVerified: boolean | null;
};
