import type { ClerkLike } from "src/types/ClerkLike";

/**
 * The user type of a `@clerk/backend` client, the Backend API `User`, which a
 * `user` mapper receives.
 *
 * @example
 * ```ts
 * type User = ClerkUserOf<ClerkClient>;
 * ```
 */
export type ClerkUserOf<TClerk extends ClerkLike> = Awaited<
  ReturnType<TClerk["users"]["getUser"]>
>;
