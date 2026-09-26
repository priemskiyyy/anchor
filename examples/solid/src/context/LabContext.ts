import { createContext } from "solid-js";

import type { SessionLab } from "example-shared/lab/types/SessionLab";

/** The lab every component reads its stores and controls from. */
export const LabContext = createContext<SessionLab>();
