import type { BetterAuthSessionLike } from "src/types/BetterAuthSessionLike";

/**
 * The user type of a Better Auth server's sessions, with the fields its
 * plugins add, from the `auth` instance's `$Infer.Session`.
 *
 * @example
 * ```ts
 * type User = BetterAuthUserOf<typeof auth>;
 * ```
 */
export type BetterAuthUserOf<TServer> = TServer extends {
  $Infer: { Session: { user: infer TUser } };
}
  ? TUser
  : BetterAuthSessionLike["user"];
