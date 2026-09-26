/**
 * The parts of an AuthKit `User` the adapter reads: the id that names the
 * principal and the profile fields of the default user.
 *
 * @example
 * ```ts
 * const user: WorkosUserLike | null = authkit.getUser();
 * ```
 */
export type WorkosUserLike = {
  id: string;
  email: string;
  emailVerified: boolean;
  firstName: string | null;
  lastName: string | null;
  profilePictureUrl: string | null;
  externalId?: string | undefined;
};
