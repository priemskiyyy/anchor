import type { EndedSession } from "example-shared/harbor/types/EndedSession";
import type { HarborTask } from "example-shared/harbor/types/HarborTask";
import type { WorkspaceView } from "example-shared/harbor/types/WorkspaceView";

/** Everything Harbor shows besides the session state itself. */
export type HarborView = {
  busy: HarborTask | null;
  /** The sentence Harbor shows about a call that failed, or `null`. */
  notice: string | null;
  ended: EndedSession | null;
  /** Each session's projects under its `session.key`, so one session's list can never show under another. */
  workspaces: Record<string, WorkspaceView>;
};
