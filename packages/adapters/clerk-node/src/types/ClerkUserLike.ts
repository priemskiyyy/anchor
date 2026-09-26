/**
 * The parts of a Backend API `User` the adapter reads: the id and the profile
 * fields of the default user, with the primary email address and phone
 * number resources as Clerk holds them.
 *
 * @example
 * ```ts
 * const user: ClerkUserLike = await clerkClient.users.getUser(userId);
 * ```
 */
export type ClerkUserLike = {
  id: string;
  externalId: string | null;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  imageUrl: string;
  primaryEmailAddress: { emailAddress: string } | null;
  primaryPhoneNumber: { phoneNumber: string } | null;
};
