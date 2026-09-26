/**
 * What AuthKit's latest refresh said of the session: its organization and
 * the email of whoever impersonates its user, each `null` when there is none.
 *
 * @example
 * ```ts
 * const refreshed: WorkosRefreshedSession | null = refreshes.getLatestRefresh();
 * ```
 */
export type WorkosRefreshedSession = {
  organizationId: string | null;
  impersonator: string | null;
};
