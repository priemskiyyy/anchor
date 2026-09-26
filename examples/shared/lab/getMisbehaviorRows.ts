import type { SessionState } from "@priemskiyyy/anchor";

import { MISBEHAVIORS } from "example-shared/lab/constants/misbehaviors";
import { getMisbehaviorAvailability } from "example-shared/lab/getMisbehaviorAvailability";
import { isMisbehaviorOn } from "example-shared/lab/isMisbehaviorOn";
import type { LabProvider } from "example-shared/providers/types/LabProvider";
import type { WorldState } from "example-shared/world/types/WorldState";

/** Each misbehavior as the panel shows it over this provider now: whether it can run, the sentence under it, and whether its switch is on. */
export const getMisbehaviorRows = (
  provider: LabProvider,
  status: SessionState<unknown, never>["status"],
  world: WorldState,
) =>
  MISBEHAVIORS.map((misbehavior) => {
    const availability = getMisbehaviorAvailability(
      misbehavior,
      provider,
      status,
    );

    return {
      misbehavior,
      available: availability.available,
      note: availability.available
        ? misbehavior.description
        : availability.reason,
      on: isMisbehaviorOn(misbehavior.id, world),
    };
  });
