import type { BetterAuthServerLike } from "src/types/BetterAuthServerLike";
import type { BetterAuthUserOf } from "src/types/BetterAuthUserOf";

/**
 * Options of `betterAuth()` from `@priemskiyyy/anchor-better-auth-node`: the application's Better Auth server
 * instance and an optional mapper from its user to the plain data a session
 * carries.
 *
 * @example
 * ```ts
 * const options: BetterAuthAdapterOptions<typeof auth, { id: string }> = {
 *   sdk: auth,
 *   user: (user) => ({ id: user.id }),
 * };
 * ```
 */
export type BetterAuthAdapterOptions<
  TServer extends BetterAuthServerLike,
  TUser,
> = {
  sdk: TServer;
  /** Maps the Better Auth user, plugin fields included, to the plain data a session carries; a snapshot of the core user fields by default. */
  user?: (user: BetterAuthUserOf<TServer>) => TUser;
};
