import type { RecordedEvent } from "src/types/internal/RecordedEvent";
import type { RecordedEventGroup } from "src/types/internal/RecordedEventGroup";

export const countEventsByGroup = (events: RecordedEvent[]) => {
  const counts: Record<RecordedEventGroup, number> = {
    LIFECYCLE: 0,
    READS: 0,
    SESSION: 0,
    TOKENS: 0,
    ENDING: 0,
    CALLBACKS: 0,
  };

  for (const event of events) {
    counts[event.group] += 1;
  }

  return counts;
};
