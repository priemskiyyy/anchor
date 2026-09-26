import { Anchor, ArrowCounterClockwise, Compass } from "@phosphor-icons/react";
import type React from "react";

import { buttonStyles } from "example-shared/ui/styles/buttonStyles";
import { HighlightFrame } from "src/components/Common/HighlightFrame";
import { ProviderPicker } from "src/components/TopBar/ProviderPicker";
import { useLab } from "src/hooks/useLab";

type TopBarProps = { toursOpen: boolean; onToursPress: () => void };

export const TopBar: React.FunctionComponent<TopBarProps> = ({
  toursOpen,
  onToursPress,
}) => {
  const lab = useLab();

  const handleResetPress = () => {
    lab.reset();
  };

  return (
    <header className="border-b border-zinc-200/70 bg-white/60 dark:border-zinc-800 dark:bg-zinc-950/60">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 sm:px-6">
        <div className="mr-auto flex min-w-0 items-center gap-3">
          <span
            aria-hidden="true"
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
          >
            <Anchor size={20} weight="duotone" />
          </span>
          <div className="min-w-0">
            <h1 className="text-lg leading-tight font-semibold">Session Lab</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              One app over real Anchor adapters. Make the provider misbehave and
              watch what Anchor keeps true.
            </p>
          </div>
        </div>
        <HighlightFrame target="provider-picker">
          <ProviderPicker />
        </HighlightFrame>
        <div className="flex gap-2">
          <button
            type="button"
            aria-expanded={toursOpen}
            aria-controls="tour-menu"
            onClick={onToursPress}
            className={buttonStyles({ pressed: toursOpen, size: "small" })}
          >
            <Compass aria-hidden="true" size={14} weight="bold" />
            Tours
          </button>
          <button
            type="button"
            onClick={handleResetPress}
            className={buttonStyles({ size: "small" })}
          >
            <ArrowCounterClockwise aria-hidden="true" size={14} weight="bold" />
            Reset
          </button>
        </div>
      </div>
    </header>
  );
};
