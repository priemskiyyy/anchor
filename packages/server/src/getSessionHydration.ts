import type { RequestSessionState } from "src/types/RequestSessionState";
import type { SessionHydration } from "src/types/SessionHydration";
import type { SessionHydrationOptions } from "src/types/SessionHydrationOptions";
import {
  SIGNED_OUT_HYDRATION,
  UNAVAILABLE_HYDRATION,
} from "src/utils/constants/hydration";

/**
 * What of a request's session may go on the page: its status and exactly
 * what `select` picks, never a token, a cookie, SDK state or a provider
 * error. Render it until the client's Anchor resolves; the Anchor never takes
 * it for evidence.
 *
 * @example
 * ```ts
 * const hydration = getSessionHydration(state, { select: ({ user }) => ({ name: user.name }) });
 * ```
 */
export const getSessionHydration = <TUser, TSnapshot>(
  state: RequestSessionState<TUser>,
  { select }: SessionHydrationOptions<TUser, TSnapshot>,
): SessionHydration<TSnapshot> => {
  if (state.status === "signed-in") {
    return Object.freeze({ status: state.status, user: select(state.session) });
  }

  if (state.status === "action-required") {
    return Object.freeze({
      status: state.status,
      action: Object.freeze({ kind: state.action.kind }),
      user: select(state.session),
    });
  }

  if (state.status === "unavailable") {
    return UNAVAILABLE_HYDRATION;
  }

  return SIGNED_OUT_HYDRATION;
};
