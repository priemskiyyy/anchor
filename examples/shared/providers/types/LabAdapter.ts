import type { SessionAdapter } from "@priemskiyyy/anchor";

import type { LabTokenProfile } from "example-shared/providers/types/LabTokenProfile";
import type { LabUser } from "example-shared/providers/types/LabUser";

/** Every catalog provider's real adapter, typed as the one Anchor Harbor registers. */
export type LabAdapter = SessionAdapter<LabUser, unknown, LabTokenProfile>;
