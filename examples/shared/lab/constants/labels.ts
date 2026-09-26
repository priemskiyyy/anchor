import type { SessionState } from "@priemskiyyy/anchor";

/** Each session status as the page names it. */
export const STATUS_LABELS: Record<
  SessionState<unknown, never>["status"],
  string
> = {
  initializing: "Initializing",
  "signed-out": "Signed out",
  "signed-in": "Signed in",
  "action-required": "Action required",
  unavailable: "Unavailable",
};
