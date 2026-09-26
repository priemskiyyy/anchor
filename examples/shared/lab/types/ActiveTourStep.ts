import type { HighlightTarget } from "example-shared/lab/types/HighlightTarget";

/** A step of the running tour, its words written for the provider it started over. */
export type ActiveTourStep = {
  title: string;
  body: string;
  highlights: HighlightTarget[];
};
