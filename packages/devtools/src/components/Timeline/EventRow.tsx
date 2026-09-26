import { CopyButton } from "src/components/Timeline/CopyButton";
import { formatEventDate } from "src/formatting/formatEventDate";
import { formatEventTime } from "src/formatting/formatEventTime";
import { formatSessionKey } from "src/formatting/formatSessionKey";
import type { RecordedEvent } from "src/types/internal/RecordedEvent";

type EventRowProps = {
  event: RecordedEvent;
};

export const EventRow = (props: EventRowProps) => {
  const date = () => formatEventDate(props.event.timestamp);

  return (
    <details class="event" data-group={props.event.group}>
      <summary>
        <time dateTime={date()} title={date()}>
          {formatEventTime(props.event.timestamp)}
        </time>
        <span class="event-type">{props.event.type}</span>
        <span class="event-session" title={props.event.session?.key}>
          {formatSessionKey(props.event.session)}
        </span>
        <span class="event-summary" title={props.event.summary}>
          {props.event.summary}
        </span>
        <svg
          class="expand"
          width="10"
          height="10"
          viewBox="0 0 10 10"
          aria-hidden="true"
        >
          <path
            d="M2 3.5 5 6.5 8 3.5"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
          />
        </svg>
      </summary>
      <div class="context">
        <pre>{props.event.context}</pre>
        <CopyButton text={props.event.context} />
      </div>
    </details>
  );
};
