import type { AnchorSnapshot } from "@priemskiyyy/anchor";
import { Show } from "solid-js";

import { AnchorIcon } from "src/components/AnchorIcon";
import { formatPrincipal } from "src/formatting/formatPrincipal";
import { formatSessionLine } from "src/formatting/formatSessionLine";
import type { PanelPosition } from "src/types/internal/PanelPosition";
import { assertUnreachable } from "src/utils/assertUnreachable";

const getDockLabel = (position: PanelPosition) => {
  if (position === "bottom") {
    return "Dock to the right";
  }

  if (position === "right") {
    return "Dock to the bottom";
  }

  return assertUnreachable(position);
};

type PanelHeaderProps = {
  snapshot: AnchorSnapshot;
  showValues: boolean;
  position: PanelPosition;
  onShowValuesChange: (showValues: boolean) => void;
  onDock: () => void;
  onClose: () => void;
};

export const PanelHeader = (props: PanelHeaderProps) => (
  <header class="header">
    <AnchorIcon />
    <strong>Anchor</strong>
    <span class="status" data-state={props.snapshot.state}>
      <span class="dot" data-state={props.snapshot.state} />
      {props.snapshot.state}
    </span>
    <code
      class="session"
      title="The adapter, the session status, the generation and the session key"
    >
      {formatSessionLine(props.snapshot)}
    </code>
    <Show when={props.snapshot.session.principal}>
      {(principal) => (
        <code
          class="principal"
          title="Who the session belongs to: the authority, the subject and the tenant"
        >
          {props.showValues ? formatPrincipal(principal()) : "principal hidden"}
        </code>
      )}
    </Show>
    <label class="capture">
      <input
        type="checkbox"
        checked={props.showValues}
        onChange={(event) =>
          props.onShowValuesChange(event.currentTarget.checked)
        }
      />
      Show values
    </label>
    <button
      type="button"
      class="icon-button"
      aria-label={getDockLabel(props.position)}
      onClick={() => props.onDock()}
    >
      <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
        <rect
          x="1.5"
          y="1.5"
          width="11"
          height="11"
          rx="2"
          fill="none"
          stroke="currentColor"
          stroke-width="1.4"
        />
        {props.position === "bottom" ? (
          <rect
            x="8"
            y="1.5"
            width="4.5"
            height="11"
            rx="1"
            fill="currentColor"
          />
        ) : (
          <rect
            x="1.5"
            y="8"
            width="11"
            height="4.5"
            rx="1"
            fill="currentColor"
          />
        )}
      </svg>
    </button>
    <button
      type="button"
      class="icon-button"
      aria-label="Close devtools"
      onClick={() => props.onClose()}
    >
      <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
        <path
          d="M3 3l8 8M11 3l-8 8"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linecap="round"
        />
      </svg>
    </button>
  </header>
);
