import type { SessionState } from "@priemskiyyy/anchor";

import type { LabRuntime } from "example-shared/lab/types/LabRuntime";
import type { SessionSummary } from "example-shared/lab/types/SessionSummary";
import type { LabTokenProfile } from "example-shared/providers/types/LabTokenProfile";
import type { LabUser } from "example-shared/providers/types/LabUser";
import { getAcceptedSession } from "example-shared/utils/getAcceptedSession";
import type { LabWorld } from "example-shared/world/types/LabWorld";

/** What the lab compares of a session state, with the organization the world holds it in. */
export const getSessionSummary = (
  runtime: LabRuntime,
  state: SessionState<LabUser, LabTokenProfile>,
  world: LabWorld,
): SessionSummary => {
  const session = getAcceptedSession(state);
  const held = world.getHeldSession(runtime.provider.id);

  return {
    runtime: { id: runtime.id },
    status: state.status,
    key: session?.key ?? null,
    principal: session?.principal ?? null,
    name: session?.user.name ?? null,
    organization: session === null || held === null ? null : held.organization,
  };
};
