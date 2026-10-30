import type { BetterAuthClientLike } from "src/types/BetterAuthClientLike";
import type { BetterAuthSessionToken } from "src/types/BetterAuthSessionToken";
import type { BetterAuthUserOf } from "src/types/BetterAuthUserOf";

/**
 * Options of `betterAuth()`: the application's Better Auth client, an
 * optional mapper from its user to the plain data a session carries, how long
 * a session the client holds waits for the server to confirm it, and the token
 * profiles the adapter mints.
 *
 * @example
 * ```ts
 * const options: BetterAuthAdapterOptions<typeof authClient, { id: string; role: string }, { api: BetterAuthSessionToken }> = {
 *   sdk: authClient,
 *   user: (user) => ({ id: user.id, role: user.role }),
 *   confirmation: { timeout: 1_500 },
 *   tokens: { api: sessionToken() },
 * };
 * ```
 */
export type BetterAuthAdapterOptions<
  TClient extends BetterAuthClientLike,
  TUser,
  TTokens extends Record<string, BetterAuthSessionToken> = Record<
    never,
    BetterAuthSessionToken
  >,
> = {
  sdk: TClient;
  /** Maps the Better Auth user, plugin fields included, to the plain data a session carries; a snapshot of the core user fields by default. */
  user?: (user: BetterAuthUserOf<TClient>) => TUser;
  /** How long, in milliseconds, a session the client holds while its fetch is in flight, such as the one the Expo plugin restored from its cache, waits for the server to confirm it before it is answered unconfirmed; `0` answers it at once, and a session the server ended is then shown until the fetch settles. Absent, it waits for the server. */
  confirmation?: { timeout: number };
  tokens?: TTokens;
};
