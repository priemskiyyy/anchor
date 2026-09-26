import type { SessionState } from "@priemskiyyy/anchor";

import type { Availability } from "example-shared/lab/types/Availability";
import type { Misbehavior } from "example-shared/lab/types/Misbehavior";
import type { LabProvider } from "example-shared/providers/types/LabProvider";

const AVAILABLE: Availability = { available: true };

/** Whether a misbehavior can run over this provider now: the provider's own answer first, then what the session must be. */
export const getMisbehaviorAvailability = (
  { id, needs }: Misbehavior,
  provider: LabProvider,
  status: SessionState<unknown, never>["status"],
): Availability => {
  const behavior = provider.behaviors[id];

  if (!behavior.available) {
    return { available: false, reason: behavior.reason };
  }

  if (needs === null || status === "signed-in") {
    return AVAILABLE;
  }

  if (needs === "session" && status === "action-required") {
    return AVAILABLE;
  }

  if (status === "action-required") {
    return {
      available: false,
      reason: "Finish setting up two-factor first: the session is blocked.",
    };
  }

  return { available: false, reason: "Sign in first: this needs a session." };
};
