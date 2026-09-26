import type {
  AnchorDiagnosticEvent,
  AnchorDiagnosticType,
} from "@priemskiyyy/anchor";

import type { RecordedEventGroup } from "src/types/internal/RecordedEventGroup";
import { getFieldValue } from "src/utils/getFieldValue";

const EVENT_GROUPS = {
  "anchor started": "LIFECYCLE",
  "anchor start failed": "LIFECYCLE",
  "anchor disposed": "LIFECYCLE",
  "read started": "READS",
  "read completed": "READS",
  "read failed": "READS",
  "read superseded": "READS",
  "answer invalid": "READS",
  "session accepted": "SESSION",
  "session updated": "SESSION",
  "session signed out": "SESSION",
  "session unavailable": "SESSION",
  "token requested": "TOKENS",
  "token joined": "TOKENS",
  "token received": "TOKENS",
  "token failed": "TOKENS",
  "token discarded": "TOKENS",
  "end started": "ENDING",
  "end completed": "ENDING",
  "end failed": "ENDING",
  "callback ignored": "CALLBACKS",
} satisfies Record<AnchorDiagnosticType, RecordedEventGroup>;

export const getEventGroup = ({
  type,
  context,
}: Pick<AnchorDiagnosticEvent, "type" | "context">): RecordedEventGroup => {
  const operation = getFieldValue(context, "operation");

  if (type === "answer invalid" && operation === "token") {
    return "TOKENS";
  }

  if (type === "answer invalid" && operation === "end") {
    return "ENDING";
  }

  return EVENT_GROUPS[type];
};
