import type { BetterAuthSessionLike } from "src/types/BetterAuthSessionLike";

/**
 * The user type of a Better Auth client's sessions, with the fields its
 * plugins add, from the client's `$Infer.Session`.
 *
 * @example
 * ```ts
 * type User = BetterAuthUserOf<typeof authClient>;
 * ```
 */
export type BetterAuthUserOf<TClient> = TClient extends {
  $Infer: { Session: { user: infer TUser } };
}
  ? TUser
  : BetterAuthSessionLike["user"];
