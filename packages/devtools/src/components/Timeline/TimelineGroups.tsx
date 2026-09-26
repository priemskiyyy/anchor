import { For, createMemo } from "solid-js";

import { useTimeline } from "src/components/Timeline/useTimeline";
import type { RecordedEventGroup } from "src/types/internal/RecordedEventGroup";
import { countEventsByGroup } from "src/utils/countEventsByGroup";

const GROUPS: RecordedEventGroup[] = [
  "LIFECYCLE",
  "READS",
  "SESSION",
  "TOKENS",
  "ENDING",
  "CALLBACKS",
];

const GROUP_LABELS = {
  LIFECYCLE: "Lifecycle",
  READS: "Reads",
  SESSION: "Session",
  TOKENS: "Tokens",
  ENDING: "Ending",
  CALLBACKS: "Callbacks",
} satisfies Record<RecordedEventGroup, string>;

export const TimelineGroups = () => {
  const timeline = useTimeline();
  const counts = createMemo(() => countEventsByGroup(timeline.events()));
  const selected = () => timeline.filters.filters().group;

  return (
    <div class="groups" role="group" aria-label="Event groups">
      <button
        type="button"
        class="chip"
        aria-pressed={selected() === null}
        onClick={() => timeline.filters.updateFilters({ group: null })}
      >
        All <span class="count">{timeline.events().length}</span>
      </button>
      <For each={GROUPS}>
        {(group) => (
          <button
            type="button"
            class="chip"
            data-group={group}
            aria-pressed={selected() === group}
            onClick={() => timeline.filters.updateFilters({ group })}
          >
            {GROUP_LABELS[group]} <span class="count">{counts()[group]}</span>
          </button>
        )}
      </For>
    </div>
  );
};
