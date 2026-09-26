import type { ActiveTourStep } from "example-shared/lab/types/ActiveTourStep";

/** The running tour: its steps, the one shown, the last one performed, and whether that one is still running. */
export type TourState = {
  tour: { id: string; title: string };
  steps: ActiveTourStep[];
  index: number;
  performed: number;
  status: "running" | "ready" | "failed";
  failure: string | null;
};
