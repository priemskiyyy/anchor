/**
 * The parts of a Better Auth session the adapter reads: the user's id and
 * anonymity, and the session's id, active organization and team, and
 * impersonator. The session's token never leaves the adapter.
 *
 * @example
 * ```ts
 * const session: BetterAuthSessionLike | null = await auth.api.getSession({ headers });
 * ```
 */
export type BetterAuthSessionLike = {
  user: {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    image?: string | null | undefined;
    isAnonymous?: boolean | null | undefined;
  };
  session: {
    id: string;
    activeOrganizationId?: string | null | undefined;
    activeTeamId?: string | null | undefined;
    impersonatedBy?: string | null | undefined;
  };
};
