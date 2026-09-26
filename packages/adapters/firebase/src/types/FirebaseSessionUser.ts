/**
 * The default user of a Firebase session: a plain snapshot of the Firebase
 * user's profile fields, under Firebase's own names.
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
