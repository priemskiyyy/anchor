/**
 * The default user of a Firebase session: a plain snapshot of the user's
 * profile claims under the names the client adapter gives the Firebase user's
 * fields, with `null` for a missing one.
 *
 * @example
 * ```ts
 * const name = state.status === "signed-in" ? state.session.user.displayName : null;
 * ```
 */
export type FirebaseSessionUser = {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  displayName: string | null;
  photoURL: string | null;
  phoneNumber: string | null;
};
