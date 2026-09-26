import type { MsalAccessToken } from "src/types/MsalAccessToken";
import type { MsalAccountOf } from "src/types/MsalAccountOf";
import type { MsalLike } from "src/types/MsalLike";

/**
 * Options of `msal()`: the application's MSAL.js client, the promise every
 * read waits for while MSAL loads its cache, an optional mapper from the
 * active account to the plain data a session carries, and the token profiles
 * the adapter mints.
 *
 * @example
 * ```ts
 * const options: MsalAdapterOptions<PublicClientApplication, { id: string }, { graph: MsalAccessToken }> = {
 *   sdk: msalInstance,
 *   initialized: msalInstance.initialize(),
 *   user: (account) => ({ id: account.homeAccountId }),
 *   tokens: { graph: accessToken({ scopes: ["User.Read"] }) },
 * };
 * ```
 */
export type MsalAdapterOptions<
  TClient extends MsalLike,
  TUser,
  TTokens extends Record<string, MsalAccessToken>,
> = {
  sdk: TClient;
  /** The promise `initialize()` returned, or one that also handles the redirect and sets the active account. Every read waits for it, so an Anchor started while MSAL loads its cache is never signed out before MSAL found the account. */
  initialized?: PromiseLike<unknown>;
  /** Maps the active account to the plain data a session carries; a snapshot of its fields by default. */
  user?: (account: MsalAccountOf<TClient>) => TUser;
  tokens?: TTokens;
};
