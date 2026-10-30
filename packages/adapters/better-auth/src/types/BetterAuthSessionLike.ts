/**
 * The parts of a Better Auth session the adapter reads: the user's id and
 * anonymity, and the session's id, active organization and team, impersonator
 * and token. The token leaves the adapter only through a `sessionToken()`
 * profile you declared.
 *
 * @example
 * ```ts
 * const { data } = await authClient.getSession();
 * const session: BetterAuthSessionLike | null = data;
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
    token?: string | undefined;
    activeOrganizationId?: string | null | undefined;
    activeTeamId?: string | null | undefined;
    impersonatedBy?: string | null | undefined;
  };
};
