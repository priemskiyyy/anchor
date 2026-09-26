import { ArrowClockwise } from "@phosphor-icons/react";
import clsx from "clsx";
import type React from "react";
import type { ReactNode } from "react";

import { describeCapabilities } from "example-shared/formatting/describeCapabilities";
import { buttonStyles } from "example-shared/ui/styles/buttonStyles";
import { CARD_CLASS_NAME } from "example-shared/ui/styles/cardStyles";
import { HighlightFrame } from "src/components/Common/HighlightFrame";
import { SectionHeading } from "src/components/Common/SectionHeading";
import { useLab } from "src/hooks/useLab";
import { useObservable } from "src/hooks/useObservable";

type AppWindowProps = { children: ReactNode };

export const AppWindow: React.FunctionComponent<AppWindowProps> = ({
  children,
}) => {
  const lab = useLab();
  const { provider } = useObservable(lab.runtime);

  const handleReloadPress = () => {
    lab.reload();
  };

  return (
    <section
      aria-labelledby="your-app-title"
      className="flex min-w-0 flex-col gap-3"
    >
      <SectionHeading
        id="your-app-title"
        title="Your app"
        shows="Harbor, a team notes app. Its screens come from useSession() alone."
      />
      <HighlightFrame target="app">
        <div className={clsx("overflow-hidden", CARD_CLASS_NAME)}>
          <div className="flex items-center gap-2 border-b border-zinc-200 bg-zinc-100/80 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900">
            <span aria-hidden="true" className="flex shrink-0 gap-1.5">
              <span className="size-2.5 rounded-full bg-rose-400" />
              <span className="size-2.5 rounded-full bg-amber-400" />
              <span className="size-2.5 rounded-full bg-emerald-400" />
            </span>
            <span className="min-w-0 truncate rounded-md bg-white px-2 py-0.5 font-mono text-xs text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
              harbor.example
            </span>
            <button
              type="button"
              onClick={handleReloadPress}
              className={clsx(
                "ml-auto",
                buttonStyles({ variant: "ghost", size: "small" }),
              )}
            >
              <ArrowClockwise aria-hidden="true" size={14} weight="bold" />
              Reload Harbor
            </button>
          </div>
          <div className="min-h-[22rem] p-4 sm:p-5">{children}</div>
          <p className="border-t border-zinc-200 px-4 py-2 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              On {provider.name}:
            </span>{" "}
            {describeCapabilities(provider).join(" · ")}
          </p>
        </div>
      </HighlightFrame>
    </section>
  );
};
