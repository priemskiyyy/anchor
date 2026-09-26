import type { WorkosAccessToken } from "src/types/WorkosAccessToken";
import type { WorkosClientLike } from "src/types/WorkosClientLike";
import type { WorkosRefreshes } from "src/types/WorkosRefreshes";
import type { WorkosUserOf } from "src/types/WorkosUserOf";

/**
 * Options of `workos()`: the application's AuthKit client, the refreshes
 * that client reports through the callbacks it was created with, an optional
 * mapper from the AuthKit user to the plain data a session carries, and the
 * token profiles the adapter mints.
 *
 * @example
 * ```ts
 * const options: WorkosAdapterOptions<Client, { id: string }, { api: WorkosAccessToken }> = {
 *   sdk: client,
 *   refreshes,
 *   user: (user) => ({ id: user.id }),
 *   tokens: { api: accessToken() },
 * };
 * ```
 */
export type WorkosAdapterOptions<
  TClient extends WorkosClientLike,
  TUser,
  TTokens extends Record<string, WorkosAccessToken>,
> = {
  sdk: TClient;
  /** The object `workosRefreshes()` returned, whose callbacks the client was created with. */
  refreshes: WorkosRefreshes;
  /** Maps the AuthKit user to the plain data a session carries; a snapshot of the profile fields by default. */
  user?: (user: WorkosUserOf<TClient>) => TUser;
  tokens?: TTokens;
};
