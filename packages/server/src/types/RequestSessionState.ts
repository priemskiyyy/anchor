import type { AnchorError, SessionAction } from "@priemskiyyy/anchor";

import type { RequestSession } from "src/types/RequestSession";

/**
 * What one request's session is: `signed-out`, `signed-in`, `action-required`,
 * or `unavailable` when the provider could not tell, which is never taken for
 * signed out.
 *
 * @example
 * ```ts
 * if (state.status === "unavailable") console.error(state.error.code);
 * ```
 */
export type RequestSessionState<TUser> =
  | { status: "signed-out" }
  | { status: "signed-in"; session: RequestSession<TUser> }
  | {
      status: "action-required";
      action: SessionAction;
      session: RequestSession<TUser>;
    }
  | { status: "unavailable"; error: AnchorError };
