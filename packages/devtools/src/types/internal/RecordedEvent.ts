import type { AnchorDiagnosticEvent } from "@priemskiyyy/anchor";

import type { RecordedEventGroup } from "src/types/internal/RecordedEventGroup";

export type RecordedEvent = Pick<
  AnchorDiagnosticEvent,
  "type" | "session" | "timestamp"
> & {
  id: number;
  group: RecordedEventGroup;
  summary: string;
  context: string;
};
