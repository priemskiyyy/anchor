import type { LabAnchor } from "example-shared/providers/types/LabAnchor";
import type { LabProvider } from "example-shared/providers/types/LabProvider";
import type { SimulatedProvider } from "example-shared/providers/types/SimulatedProvider";

/** One Harbor start: the chosen provider, its simulated SDK and real adapter, and the Anchor over them. A reload, a reset or another provider is a new runtime under a new `id`. */
export type LabRuntime = {
  id: number;
  provider: LabProvider;
  simulated: SimulatedProvider;
  anchor: LabAnchor;
};
