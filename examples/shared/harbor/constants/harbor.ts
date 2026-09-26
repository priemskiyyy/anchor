import type { HarborView } from "example-shared/harbor/types/HarborView";

/** What Harbor shows before anything happened. */
export const INITIAL_HARBOR_VIEW: HarborView = {
  busy: null,
  notice: null,
  ended: null,
  workspaces: {},
};
