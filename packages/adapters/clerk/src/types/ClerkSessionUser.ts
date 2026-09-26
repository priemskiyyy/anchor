/**
 * The default user of a Clerk session: a plain snapshot of the Clerk user's
 * profile fields under Clerk's names, with `null` for a missing one, and the
 * primary email address and phone number as the strings they hold.
 *
 * @example
 * ```ts
 * const email = state.status === "signed-in" ? state.session.user.primaryEmailAddress : null;
 * ```
 */
export type ClerkSessionUser = {
  id: string;
  externalId: string | null;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  imageUrl: string;
  primaryEmailAddress: string | null;
  primaryPhoneNumber: string | null;
};
