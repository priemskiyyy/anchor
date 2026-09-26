import { useAnchor } from "@priemskiyyy/anchor-react";
import clsx from "clsx";
import type React from "react";

import { describeOperation } from "example-shared/formatting/describeOperation";
import { CARD_CLASS_NAME } from "example-shared/ui/styles/cardStyles";
import { HighlightFrame } from "src/components/Common/HighlightFrame";
import { useObservable } from "src/hooks/useObservable";

export const WorkInFlight: React.FunctionComponent = () => {
  const { operations } = useObservable(useAnchor().diagnostics);

  return (
    <HighlightFrame target="work-in-flight">
      <section
        aria-label="Work in flight"
        className={clsx("flex flex-col gap-2 p-4", CARD_CLASS_NAME)}
      >
        <h3 className="font-semibold">Work in flight</h3>
        {operations.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Nothing in flight.
          </p>
        ) : (
          <ul
            aria-label="Operations in flight"
            className="flex flex-col gap-1.5"
          >
            {operations.map((operation) => (
              <li
                key={describeOperation(operation)}
                className="rounded-lg bg-zinc-100 px-3 py-2 font-mono text-xs motion-safe:animate-flash dark:bg-zinc-800/70"
              >
                {describeOperation(operation)}
              </li>
            ))}
          </ul>
        )}
      </section>
    </HighlightFrame>
  );
};
