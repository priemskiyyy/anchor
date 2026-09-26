import type { AnchorSession } from "@priemskiyyy/anchor";

import type { LabTokenProfile } from "example-shared/providers/types/LabTokenProfile";
import type { LabUser } from "example-shared/providers/types/LabUser";

export type LabSession = AnchorSession<LabUser, LabTokenProfile>;
