import type { MisbehaviorId } from "example-shared/providers/types/MisbehaviorId";
import type { ProviderBehavior } from "example-shared/providers/types/ProviderBehavior";
import type { ProviderCapabilities } from "example-shared/providers/types/ProviderCapabilities";
import type { ProviderContext } from "example-shared/providers/types/ProviderContext";
import type { ProviderIcon } from "example-shared/providers/types/ProviderIcon";
import type { SimulatedProvider } from "example-shared/providers/types/SimulatedProvider";

/** One entry of the catalog: a provider the picker lists, what it can do, and how to build it over the world. */
export type LabProvider = {
  id: string;
  label: string;
  /** How a sentence names the provider after its first word: the label, or "your backend" for your own. */
  name: string;
  icon: ProviderIcon;
  /** The SDK the simulation is modelled on, with the version the adapter's own fake names. */
  sdk: string;
  capabilities: ProviderCapabilities;
  behaviors: Record<MisbehaviorId, ProviderBehavior>;
  create: (context: ProviderContext) => SimulatedProvider;
};
