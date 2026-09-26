/**
 * The default user of an Amplify session: a plain snapshot of the user
 * `getCurrentUser()` answers, under Amplify's names, with `null` for a field
 * it lacks.
 *
 * @example
 * ```ts
 * const loginId = state.status === "signed-in" ? state.session.user.signInDetails?.loginId : null;
 * ```
 */
export type AmplifySessionUser = {
  username: string;
  userId: string;
  signInDetails: {
    loginId: string | null;
    authFlowType: string | null;
  } | null;
};
