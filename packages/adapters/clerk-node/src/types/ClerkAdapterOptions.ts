import type { ClerkLike } from "src/types/ClerkLike";
import type { ClerkUserOf } from "src/types/ClerkUserOf";

/**
 * Options of `clerk()` from `@priemskiyyy/anchor-clerk-node`: the server's
 * `@clerk/backend` client, the origins Clerk accepts session tokens from, and
 * an optional mapper from the Clerk user to the plain data a session carries.
 *
 * @example
 * ```ts
 * const options: ClerkAdapterOptions<ClerkClient, { id: string }> = {
 *   sdk: clerkClient,
 *   authorizedParties: ["https://app.example.com"],
 *   user: (user) => ({ id: user.id }),
 * };
 * ```
 */
export type ClerkAdapterOptions<TClerk extends ClerkLike, TUser> = {
  sdk: TClerk;
  /** The origins your pages are served from, which Clerk checks each session token's `azp` claim against, as `authenticateRequest()` takes them. */
  authorizedParties?: string[];
  /** Maps the Clerk user, as the Backend API answers it, to the plain data a session carries; a snapshot of its profile fields by default. */
  user?: (user: ClerkUserOf<TClerk>) => TUser;
};
