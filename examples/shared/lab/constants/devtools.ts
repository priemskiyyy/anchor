import type { DevtoolsControls } from "example-shared/lab/types/DevtoolsControls";

/** What the diagnostics tour drives on a page that mounts no devtools: nothing. */
export const ABSENT_DEVTOOLS: DevtoolsControls = {
  open: () => {},
  showValues: () => {},
  close: () => {},
};
