import type { WorkosUserLike } from "src/types/WorkosUserLike";

/**
 * The parts of an authenticated or refreshed sealed session the adapter
 * reads: its user, its WorkOS session, the organization it is in and who
 * impersonates its user.
 *
 * @example
 * ```ts
 * const authentication = await session.authenticate();
 * const authenticated: WorkosSessionLike | null = authentication.authenticated ? authentication : null;
 * ```
 */
export type WorkosSessionLike = {
  sessionId: string;
  organizationId?: string | undefined;
  user: WorkosUserLike;
  impersonator?: { email: string } | undefined;
};
