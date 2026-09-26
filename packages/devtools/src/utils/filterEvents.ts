import type { EventFilters } from "src/types/internal/EventFilters";
import type { RecordedEvent } from "src/types/internal/RecordedEvent";

export const filterEvents = (
  events: RecordedEvent[],
  filters: EventFilters,
) => {
  const query = filters.query.trim().toLowerCase();

  return events.filter((event) => {
    if (filters.group !== null && event.group !== filters.group) {
      return false;
    }

    return `${event.type} ${event.session?.key ?? ""} ${event.summary} ${event.context}`
      .toLowerCase()
      .includes(query);
  });
};
