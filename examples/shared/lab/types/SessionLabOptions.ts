import type { SyncHint } from "@priemskiyyy/anchor";

import type { DevtoolsControls } from "example-shared/lab/types/DevtoolsControls";
import type { LabProvider } from "example-shared/providers/types/LabProvider";

export type SessionLabOptions = {
  /** Installed by every Anchor the lab starts, such as the browser's `visibility()`. */
  hints?: SyncHint[];
  /** The providers the picker offers; the whole catalog by default. */
  catalog?: LabProvider[];
  /** The id of the provider Harbor starts on; the catalog's first by default. */
  provider?: string;
  /** How the diagnostics tour drives the devtools; a page without them passes nothing. */
  devtools?: DevtoolsControls;
};
