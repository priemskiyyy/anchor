/**
 * The parts of the auth object a signed-in request state answers that the
 * adapter reads: who the session belongs to, its status, its active
 * organization and its actor, and the issuer of its token.
 *
 * @example
 * ```ts
 * const auth: ClerkAuthLike = state.toAuth({ treatPendingAsSignedOut: false });
 * ```
 */
export type ClerkAuthLike = {
  /** The session token's claims, whose `iss` is the instance's Frontend API URL. */
  sessionClaims: { iss: string };
  sessionId: string;
  /** `pending` while the user has a task to complete, such as choosing an organization. */
  sessionStatus: string | null;
  userId: string;
  orgId: string | undefined;
  /** Who impersonates the user, as the session token's `act` claim names them. */
  actor: { sub: string } | undefined;
};
