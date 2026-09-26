import type { MisbehaviorId } from "example-shared/providers/types/MisbehaviorId";
import type { WorldState } from "example-shared/world/types/WorldState";

const SWITCHES: Partial<Record<MisbehaviorId, (state: WorldState) => boolean>> =
  { offline: ({ online }) => !online, slow: ({ slow }) => slow };

/** Whether a switch of the panel is on now; an action never is. */
export const isMisbehaviorOn = (id: MisbehaviorId, state: WorldState) =>
  SWITCHES[id]?.(state) ?? false;
