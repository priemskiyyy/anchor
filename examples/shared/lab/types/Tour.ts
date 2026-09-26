import type { TourStep } from "example-shared/lab/types/TourStep";

/** A walkthrough of three to five steps that proves one guarantee. */
export type Tour = {
  id: string;
  title: string;
  summary: string;
  steps: TourStep[];
};
