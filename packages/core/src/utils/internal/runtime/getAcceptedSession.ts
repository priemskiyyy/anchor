import type { SessionState } from "src/types/SessionState";

export const getAcceptedSession = <TUser, TProfile extends string>(
  state: SessionState<TUser, TProfile>,
) =>
  state.status === "signed-in" || state.status === "action-required"
    ? state.session
    : null;
