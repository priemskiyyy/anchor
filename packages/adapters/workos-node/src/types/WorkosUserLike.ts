/**
 * The parts of a WorkOS `User` the adapter reads: the id that names the
 * principal and the profile fields of the default user.
 *
 * @example
 * ```ts
 * const user: WorkosUserLike = authentication.user;
 * ```
 */
export type WorkosUserLike = {
  id: string;
  email: string;
  emailVerified: boolean;
  firstName: string | null;
  lastName: string | null;
  profilePictureUrl: string | null;
  externalId?: string | null | undefined;
};
