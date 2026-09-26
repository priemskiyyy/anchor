/**
 * The parts of what AuthKit hands its `onRefresh` callback that the adapter
 * keeps: the organization the refreshed session is in and who impersonates
 * its user. The access token it carries is never kept.
 *
 * @example
 * ```ts
 * const refresh: WorkosRefreshLike = { organizationId: "org_acme" };
 * ```
 */
export type WorkosRefreshLike = {
  organizationId?: string | undefined;
  impersonator?: { email: string } | undefined;
};
