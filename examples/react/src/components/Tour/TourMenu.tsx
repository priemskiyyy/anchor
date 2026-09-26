import clsx from "clsx";
import type React from "react";

import { buttonStyles } from "example-shared/ui/styles/buttonStyles";
import { PAGE_CLASS_NAME } from "example-shared/ui/styles/pageStyles";
import { useLab } from "src/hooks/useLab";

type TourMenuProps = { onStart: () => void };

export const TourMenu: React.FunctionComponent<TourMenuProps> = ({
  onStart,
}) => {
  const lab = useLab();

  return (
    <section
      id="tour-menu"
      aria-label="Tours"
      className={clsx(PAGE_CLASS_NAME, "pt-6")}
    >
      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {lab.tours.map(({ id, title, summary }, index) => (
          <li
            key={id}
            className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
          >
            <p className="font-mono text-xs font-semibold text-blue-700 dark:text-blue-300">
              Tour {index + 1}
            </p>
            <h2 className="font-semibold">{title}</h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {summary}
            </p>
            <button
              type="button"
              aria-label={`Start ${title}`}
              onClick={() => {
                onStart();
                lab.startTour(id);
              }}
              className={buttonStyles({ variant: "primary", size: "small" })}
            >
              Start
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
};
