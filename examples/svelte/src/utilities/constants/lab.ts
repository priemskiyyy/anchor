import { createContext } from "svelte";

import type { SessionLab } from "example-shared/lab/types/SessionLab";

/** The typed context `Application.svelte` sets the lab in, as its getter and setter. */
export const LAB_CONTEXT = createContext<SessionLab>();
