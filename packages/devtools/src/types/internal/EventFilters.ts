import type { RecordedEventGroup } from "src/types/internal/RecordedEventGroup";

export type EventFilters = {
  query: string;
  group: RecordedEventGroup | null;
};
