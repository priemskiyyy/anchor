import type { ClerkRequestStateLike } from "src/types/ClerkRequestStateLike";
import type { ClerkUserLike } from "src/types/ClerkUserLike";

/**
 * The parts of the `@clerk/backend` client the adapter calls. Pass the client
 * `createClerkClient()` returned; the adapter never creates it.
 *
 * @example
 * ```ts
 * const sdk: ClerkLike = createClerkClient({ secretKey, publishableKey });
 * ```
 */
export type ClerkLike = {
  authenticateRequest: (
    request: Request,
    options: { authorizedParties?: string[] },
  ) => Promise<ClerkRequestStateLike>;
  users: { getUser: (userId: string) => Promise<ClerkUserLike> };
};
