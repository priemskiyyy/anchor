import type { AnchorSession } from "src/types/AnchorSession";
import type { SessionAction } from "src/types/SessionAction";
import type { AnchorError } from "src/utils/AnchorError";

/**
 * What the session is now: `initializing` until the first resolution, then
 * `signed-out`, `signed-in`, `action-required` while the provider blocks the
 * session on a step, or `unavailable` when the first resolution failed.
 *
 * @example
 * ```ts
 * const state = anchor.session.get();
 *
 * if (state.status === "signed-in") console.log(state.session.user);
 * ```
 */
export type SessionState<TUser, TProfile extends string> =
  | { status: "initializing" }
  | { status: "signed-out" }
  | { status: "signed-in"; session: AnchorSession<TUser, TProfile> }
  | {
      status: "action-required";
      action: SessionAction;
      session: AnchorSession<TUser, TProfile>;
    }
  | { status: "unavailable"; error: AnchorError };
