import type { ServerSessionAdapter } from "@priemskiyyy/anchor-server";

import type { ClerkAdapterOptions } from "src/types/ClerkAdapterOptions";
import type { ClerkLike } from "src/types/ClerkLike";
import type { ClerkSessionUser } from "src/types/ClerkSessionUser";
import type { ClerkUserOf } from "src/types/ClerkUserOf";
import { CLERK_ADAPTER_NAME } from "src/utils/constants/clerk";
import { getClerkSessionUser } from "src/utils/getClerkSessionUser";
import { getServerSessionAnswer } from "src/utils/getServerSessionAnswer";

/**
 * Request-scoped Clerk sessions for `getRequestSession()` from
 * `@priemskiyyy/anchor-server`, over the server's `@clerk/backend` client:
 * each read authenticates the request itself with `authenticateRequest()`,
 * maps its organization, actor and pending status as the client adapter does,
 * and sets the headers Clerk wants on the response.
 *
 * @example
 * ```ts
 * const { state, headers } = await getRequestSession(request, { adapter: clerk({ sdk: clerkClient }) });
 * ```
 */
export function clerk<TClerk extends ClerkLike>(
  options: ClerkAdapterOptions<TClerk, ClerkSessionUser> & {
    user?: undefined;
  },
): ServerSessionAdapter<ClerkSessionUser, TClerk>;

export function clerk<TClerk extends ClerkLike, TUser>(
  options: ClerkAdapterOptions<TClerk, TUser> & {
    user: (user: ClerkUserOf<TClerk>) => TUser;
  },
): ServerSessionAdapter<TUser, TClerk>;

// An overload pair resolves the user type from whether a mapper is given, as Silo's value does.
export function clerk({
  sdk,
  authorizedParties,
  user = getClerkSessionUser,
}: ClerkAdapterOptions<ClerkLike, unknown>): ServerSessionAdapter<
  unknown,
  ClerkLike
> {
  const options = authorizedParties === undefined ? {} : { authorizedParties };

  return {
    name: CLERK_ADAPTER_NAME,
    native: sdk,
    read: (request) => getServerSessionAnswer(sdk, request, options, user),
  };
}
