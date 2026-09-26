import { Eraser } from "@phosphor-icons/react";
import clsx from "clsx";
import type React from "react";

import { formatClockTime } from "example-shared/formatting/formatClockTime";
import { buttonStyles } from "example-shared/ui/styles/buttonStyles";
import { CARD_CLASS_NAME } from "example-shared/ui/styles/cardStyles";
import { dotStyles } from "example-shared/ui/styles/dotStyles";
import { HighlightFrame } from "src/components/Common/HighlightFrame";
import { useLab } from "src/hooks/useLab";
import { useObservable } from "src/hooks/useObservable";

export const TimelineList: React.FunctionComponent = () => {
  const { timeline } = useLab();
  const entries = useObservable(timeline);

  return (
    <HighlightFrame target="timeline">
      <section
        aria-label="Timeline"
        className={clsx("flex flex-col gap-2 p-4", CARD_CLASS_NAME)}
      >
        <div className="flex items-center gap-2">
          <h3 className="mr-auto font-semibold">Timeline</h3>
          <button
            type="button"
            disabled={entries.length === 0}
            onClick={timeline.clear}
            className={buttonStyles({ variant: "ghost", size: "small" })}
          >
            <Eraser aria-hidden="true" size={14} weight="bold" />
            Clear
          </button>
        </div>
        {entries.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Nothing yet. Sign in to see Anchor&apos;s events here.
          </p>
        ) : (
          <ol
            aria-label="Timeline events"
            className="flex max-h-[26rem] flex-col divide-y divide-zinc-200/70 overflow-y-auto dark:divide-zinc-800"
          >
            {entries.map(({ id, type, line, tone, timestamp, provider }) => (
              <li
                key={id}
                className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-2.5 gap-y-0.5 py-2 text-sm motion-safe:animate-flash"
              >
                <span
                  aria-hidden="true"
                  className={clsx("mt-1.5", dotStyles({ tone }))}
                />
                <span>{line}</span>
                <span className="col-start-2 font-mono text-xs text-zinc-500 dark:text-zinc-400">
                  {type ?? "harbor"} · {provider.label} ·{" "}
                  {formatClockTime(timestamp)}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </HighlightFrame>
  );
};
