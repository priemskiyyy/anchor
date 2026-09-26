import type { AnchorDiagnosticType, SessionState } from "@priemskiyyy/anchor";

import type { Tone } from "example-shared/types/Tone";

/** The tone each session status is shown in. */
export const STATUS_TONES: Record<
  SessionState<unknown, never>["status"],
  Tone
> = {
  initializing: "info",
  "signed-out": "neutral",
  "signed-in": "positive",
  "action-required": "warning",
  unavailable: "danger",
};

/** The tone of each diagnostic event's line in the timeline. */
export const TIMELINE_TONES: Record<AnchorDiagnosticType, Tone> = {
  "anchor started": "positive",
  "anchor start failed": "danger",
  "anchor disposed": "neutral",
  "read started": "info",
  "read completed": "neutral",
  "read failed": "danger",
  "read superseded": "warning",
  "answer invalid": "danger",
  "session accepted": "positive",
  "session updated": "accent",
  "session signed out": "neutral",
  "session unavailable": "danger",
  "token requested": "info",
  "token joined": "info",
  "token received": "positive",
  "token failed": "danger",
  "token discarded": "warning",
  "end started": "info",
  "end completed": "positive",
  "end failed": "danger",
  "callback ignored": "warning",
};
