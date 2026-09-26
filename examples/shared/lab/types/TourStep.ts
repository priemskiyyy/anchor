import type { HighlightTarget } from "example-shared/lab/types/HighlightTarget";
import type { TourActions } from "example-shared/lab/types/TourActions";
import type { LabProvider } from "example-shared/providers/types/LabProvider";

/** One step of a tour: what it says for the chosen provider, what it points at, and what it does. */
export type TourStep = {
  title: string;
  body: (provider: LabProvider) => string;
  highlights: HighlightTarget[];
  /** Leaves the step out for a provider that cannot show it. */
  isSkipped?: (provider: LabProvider) => boolean;
  perform: (actions: TourActions, provider: LabProvider) => Promise<void>;
};
