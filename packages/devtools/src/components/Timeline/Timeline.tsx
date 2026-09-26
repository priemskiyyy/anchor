import type { ParentProps } from "solid-js";

import { TimelineEmpty } from "src/components/Timeline/TimelineEmpty";
import { TimelineGroups } from "src/components/Timeline/TimelineGroups";
import { TimelineRows } from "src/components/Timeline/TimelineRows";
import { TimelineToolbar } from "src/components/Timeline/TimelineToolbar";
import { TimelineContext } from "src/components/Timeline/useTimeline";
import type { EventFilterControls } from "src/types/internal/EventFilterControls";
import type { RecordedEvent } from "src/types/internal/RecordedEvent";
import type { TimelineContextValue } from "src/types/internal/TimelineContextValue";

type TimelineProps = ParentProps<{
  events: RecordedEvent[];
  isPaused: boolean;
  filters: EventFilterControls;
  onTogglePause: () => void;
  onClear: () => void;
}>;

const TimelineRoot = (props: TimelineProps) => {
  const value: TimelineContextValue = {
    events: () => props.events,
    isPaused: () => props.isPaused,
    filters: props.filters,
    onTogglePause: () => props.onTogglePause(),
    onClear: () => props.onClear(),
  };

  return (
    <TimelineContext.Provider value={value}>
      <div class="timeline">{props.children}</div>
    </TimelineContext.Provider>
  );
};

export const Timeline = Object.assign(TimelineRoot, {
  Toolbar: TimelineToolbar,
  Groups: TimelineGroups,
  Rows: TimelineRows,
  Empty: TimelineEmpty,
});
