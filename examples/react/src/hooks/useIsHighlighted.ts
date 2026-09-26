import type { HighlightTarget } from "example-shared/lab/types/HighlightTarget";
import { useLab } from "src/hooks/useLab";
import { useObservable } from "src/hooks/useObservable";

/** Whether the tour step shown now points at this part of the page. */
export const useIsHighlighted = (target: HighlightTarget) => {
  const tour = useObservable(useLab().tour);

  return tour?.steps[tour.index]?.highlights.includes(target) ?? false;
};
