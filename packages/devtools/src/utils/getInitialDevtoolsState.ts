import type { DevtoolsState } from "src/types/internal/DevtoolsState";

export const getInitialDevtoolsState = (
  initialIsOpen: boolean,
): DevtoolsState => ({
  panel: { state: initialIsOpen ? "OPEN" : "CLOSED", autoFocus: false },
  isPaused: false,
});
