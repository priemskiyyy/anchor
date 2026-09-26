import type { AmplifyAccessToken } from "src/types/AmplifyAccessToken";
import type { AmplifyIdToken } from "src/types/AmplifyIdToken";
import type { AmplifyLike } from "src/types/AmplifyLike";
import type { AmplifyUserOf } from "src/types/AmplifyUserOf";

/**
 * Options of `amplify()`: the Amplify Auth functions and Hub of your
 * configured application, an optional mapper from the current user to the
 * plain data a session carries, and the token profiles the adapter mints.
 *
 * @example
 * ```ts
 * const options: AmplifyAdapterOptions<{ auth: typeof auth; hub: typeof Hub }, { id: string }, { api: AmplifyAccessToken }> = {
 *   sdk: { auth, hub: Hub },
 *   user: (user) => ({ id: user.userId }),
 *   tokens: { api: accessToken() },
 * };
 * ```
 */
export type AmplifyAdapterOptions<
  TSdk extends AmplifyLike,
  TUser,
  TTokens extends Record<string, AmplifyAccessToken | AmplifyIdToken>,
> = {
  sdk: TSdk;
  /** Maps the user `getCurrentUser()` answers to the plain data a session carries; a snapshot of its fields by default. */
  user?: (user: AmplifyUserOf<TSdk>) => TUser;
  tokens?: TTokens;
};
