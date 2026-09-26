import type { BetterAuthClientLike } from "src/types/BetterAuthClientLike";
import type { BetterAuthUserOf } from "src/types/BetterAuthUserOf";

/**
 * Options of `betterAuth()`: the application's Better Auth client and an
 * optional mapper from its user to the plain data a session carries.
 *
 * @example
 * ```ts
 * const options: BetterAuthAdapterOptions<typeof authClient, { id: string; role: string }> = {
 *   sdk: authClient,
 *   user: (user) => ({ id: user.id, role: user.role }),
 * };
 * ```
 */
export type BetterAuthAdapterOptions<
  TClient extends BetterAuthClientLike,
  TUser,
> = {
  sdk: TClient;
  /** Maps the Better Auth user, plugin fields included, to the plain data a session carries; a snapshot of the core user fields by default. */
  user?: (user: BetterAuthUserOf<TClient>) => TUser;
};
