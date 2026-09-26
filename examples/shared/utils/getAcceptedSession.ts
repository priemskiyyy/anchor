import type { SessionState } from "@priemskiyyy/anchor";

/** The session a state holds, signed in or waiting on a step, or `null` when it holds none. */
export const getAcceptedSession = <TUser, TProfile extends string>(
  state: SessionState<TUser, TProfile>,
) =>
  state.status === "signed-in" || state.status === "action-required"
    ? state.session
    : null;
