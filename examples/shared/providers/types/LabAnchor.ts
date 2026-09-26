import type { Anchor } from "@priemskiyyy/anchor";

import type { LabTokenProfile } from "example-shared/providers/types/LabTokenProfile";
import type { LabUser } from "example-shared/providers/types/LabUser";

/** The Anchor every example registers: Harbor's user and token profile, over any provider. */
export type LabAnchor = Anchor<LabUser, unknown, LabTokenProfile>;
