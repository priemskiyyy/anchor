import { AnchorError } from "@priemskiyyy/anchor";
import type { SessionState } from "@priemskiyyy/anchor";

import type { RequestSessionState } from "src/types/RequestSessionState";
import { getRequestSessionOf } from "src/utils/getRequestSessionOf";

export const getRequestSessionState = <TUser, TProfile extends string>(
  state: SessionState<TUser, TProfile>,
): RequestSessionState<TUser> => {
  if (state.status === "signed-in") {
    return Object.freeze({
      status: state.status,
      session: getRequestSessionOf(state.session),
    });
  }

  if (state.status === "action-required") {
    return Object.freeze({
      status: state.status,
      action: state.action,
      session: getRequestSessionOf(state.session),
    });
  }

  // A start resolves only once the state is known, so a request still initializing was never read.
  if (state.status === "initializing") {
    return Object.freeze({
      status: "unavailable",
      error: new AnchorError({
        code: "READ_FAILED",
        message: "The request's session was never read.",
      }),
    });
  }

  return state;
};
