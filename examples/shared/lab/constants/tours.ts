import { DIAGNOSTICS_TOUR } from "example-shared/lab/constants/tours/diagnosticsTour";
import { ENDING_TOUR } from "example-shared/lab/constants/tours/endingTour";
import { FAILURE_TOUR } from "example-shared/lab/constants/tours/failureTour";
import { KEYS_TOUR } from "example-shared/lab/constants/tours/keysTour";
import { PROVIDERS_TOUR } from "example-shared/lab/constants/tours/providersTour";
import { WORK_TOUR } from "example-shared/lab/constants/tours/workTour";
import type { Tour } from "example-shared/lab/types/Tour";

/** Every tour the Tours menu offers, in its order; a tour is one more entry here. */
export const TOURS: Tour[] = [
  WORK_TOUR,
  FAILURE_TOUR,
  KEYS_TOUR,
  ENDING_TOUR,
  PROVIDERS_TOUR,
  DIAGNOSTICS_TOUR,
];
