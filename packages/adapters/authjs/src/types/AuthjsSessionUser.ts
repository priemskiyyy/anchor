/**
 * The default user of an Auth.js session: a plain snapshot of the session's
 * user under Auth.js's names, with `null` for a missing one.
 *
 * @example
 * ```ts
 * const name = state.status === "signed-in" ? state.session.user.name : null;
 * ```
 */
export type AuthjsSessionUser = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
};
