import type { ClerkLike } from "src/types/ClerkLike";

/**
 * The user type of a Clerk instance's sessions, its `UserResource`, which a
 * `user` mapper receives.
 *
 * @example
 * ```ts
 * type User = ClerkUserOf<Clerk>;
 * ```
 */
export type ClerkUserOf<TClerk extends ClerkLike> = NonNullable<
  TClerk["session"]
>["user"];
