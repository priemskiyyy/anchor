/**
 * The user `getCurrentUser()` answers: the Cognito username and user id, and
 * how the user signed in.
 *
 * @example
 * ```ts
 * const user: AmplifyUserLike = await getCurrentUser();
 * ```
 */
export type AmplifyUserLike = {
  username: string;
  /** The user's `sub` in the user pool. */
  userId: string;
  signInDetails?: { loginId?: string; authFlowType?: string } | undefined;
};
