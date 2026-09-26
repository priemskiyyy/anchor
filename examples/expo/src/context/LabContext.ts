import { createContext } from "react";

import type { SessionLab } from "example-shared/lab/types/SessionLab";

/** The lab every component reads its stores and controls from. */
export const LabContext = createContext<SessionLab | null>(null);
