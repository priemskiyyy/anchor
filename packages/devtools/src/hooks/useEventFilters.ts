import { createMemo, createSignal } from "solid-js";
import type { Accessor } from "solid-js";

import type { EventFilters } from "src/types/internal/EventFilters";
import type { RecordedEvent } from "src/types/internal/RecordedEvent";
import { filterEvents } from "src/utils/filterEvents";

const NO_FILTERS: EventFilters = { query: "", group: null };

export const useEventFilters = (events: Accessor<RecordedEvent[]>) => {
  const [filters, setFilters] = createSignal(NO_FILTERS);
  const visibleEvents = createMemo(() => filterEvents(events(), filters()));

  const isFiltered = createMemo(() => {
    const { query, group } = filters();

    return query.trim() !== "" || group !== null;
  });

  const updateFilters = (patch: Partial<EventFilters>) => {
    setFilters((current) => ({ ...current, ...patch }));
  };

  const clearFilters = () => {
    setFilters(NO_FILTERS);
  };

  return { filters, visibleEvents, isFiltered, updateFilters, clearFilters };
};
