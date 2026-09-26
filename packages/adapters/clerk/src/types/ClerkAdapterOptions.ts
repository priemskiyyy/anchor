import type { ClerkLike } from "src/types/ClerkLike";
import type { ClerkSessionToken } from "src/types/ClerkSessionToken";
import type { ClerkUserOf } from "src/types/ClerkUserOf";

/**
 * Options of `clerk()`: the application's Clerk instance, an optional mapper
 * from the Clerk user to the plain data a session carries, and the token
 * profiles the adapter mints.
 *
 * @example
 * ```ts
 * const options: ClerkAdapterOptions<Clerk, { id: string }, { api: ClerkSessionToken }> = {
 *   sdk: clerk,
 *   user: (user) => ({ id: user.id }),
 *   tokens: { api: sessionToken() },
 * };
 * ```
 */
export type ClerkAdapterOptions<
  TClerk extends ClerkLike,
  TUser,
  TTokens extends Record<string, ClerkSessionToken>,
> = {
  sdk: TClerk;
  /** Maps the Clerk user of the session to the plain data a session carries; a snapshot of the profile fields by default. */
  user?: (user: ClerkUserOf<TClerk>) => TUser;
  tokens?: TTokens;
};
