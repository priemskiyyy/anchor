import type { LabWorld } from "example-shared/world/types/LabWorld";

/** What a catalog entry builds its simulated SDK over: the world, and the Anchor's read for a provider that emits nothing. */
export type ProviderContext = { world: LabWorld; sync: () => Promise<void> };
