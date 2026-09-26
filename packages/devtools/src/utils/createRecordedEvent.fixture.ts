import type { RecordedEvent } from "src/types/internal/RecordedEvent";

export const createRecordedEvent = (
  overrides: Partial<RecordedEvent> & Pick<RecordedEvent, "id" | "type">,
): RecordedEvent => ({
  session: null,
  timestamp: 0,
  group: "LIFECYCLE",
  summary: "",
  context: "null",
  ...overrides,
});
