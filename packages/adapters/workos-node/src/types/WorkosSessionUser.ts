/**
 * The default user of a WorkOS session: a plain snapshot of the user's
 * profile fields under WorkOS's names, with `null` for a missing one, as the
 * client adapter snapshots the same user.
 *
 * @example
 * ```ts
 * const email = state.status === "signed-in" ? state.session.user.email : null;
 * ```
 */
export type WorkosSessionUser = {
  id: string;
  email: string;
  emailVerified: boolean;
  firstName: string | null;
  lastName: string | null;
  profilePictureUrl: string | null;
  externalId: string | null;
};
