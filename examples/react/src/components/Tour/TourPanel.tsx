import { CaretLeft, CaretRight, CircleNotch, X } from "@phosphor-icons/react";
import type React from "react";

import { buttonStyles } from "example-shared/ui/styles/buttonStyles";
import { useLab } from "src/hooks/useLab";
import { useObservable } from "src/hooks/useObservable";

export const TourPanel: React.FunctionComponent = () => {
  const lab = useLab();
  const tour = useObservable(lab.tour);

  if (tour === null) {
    return null;
  }

  const { index, steps, status, performed, failure } = tour;
  const step = steps[index];
  const running = status === "running" && index === performed;

  if (step === undefined) {
    return null;
  }

  return (
    <section
      aria-label="Tour"
      className="flex flex-col gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 sm:p-5 dark:border-blue-900/60 dark:bg-blue-950/30"
    >
      <p className="font-mono text-xs font-semibold tracking-wide text-blue-700 uppercase dark:text-blue-300">
        {tour.tour.title} · Step {index + 1} of {steps.length}
      </p>
      <h2 className="text-lg font-semibold tracking-tight">{step.title}</h2>
      <p className="max-w-3xl text-base leading-relaxed text-zinc-700 dark:text-zinc-300">
        {step.body}
      </p>
      {running ? (
        <p
          role="status"
          className="flex items-center gap-2 text-sm text-blue-800 dark:text-blue-200"
        >
          <CircleNotch
            aria-hidden="true"
            size={14}
            weight="bold"
            className="motion-safe:animate-spin"
          />
          Working. Next unlocks when the proof arrives.
        </p>
      ) : null}
      {failure === null || index !== performed ? null : (
        <p role="alert" className="text-sm text-rose-700 dark:text-rose-300">
          {failure}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={index === 0 || running}
          onClick={lab.goToPreviousStep}
          className={buttonStyles({ size: "small" })}
        >
          <CaretLeft aria-hidden="true" size={14} weight="bold" />
          Back
        </button>
        <button
          type="button"
          disabled={running}
          onClick={lab.goToNextStep}
          className={buttonStyles({ variant: "primary", size: "small" })}
        >
          {index === steps.length - 1 ? "Finish" : "Next"}
          <CaretRight aria-hidden="true" size={14} weight="bold" />
        </button>
        <button
          type="button"
          onClick={lab.endTour}
          className={buttonStyles({ variant: "ghost", size: "small" })}
        >
          <X aria-hidden="true" size={14} weight="bold" />
          End tour
        </button>
      </div>
    </section>
  );
};
