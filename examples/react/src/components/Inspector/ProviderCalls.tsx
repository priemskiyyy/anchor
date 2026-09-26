import clsx from "clsx";
import type React from "react";

import { CARD_CLASS_NAME } from "example-shared/ui/styles/cardStyles";
import { HighlightFrame } from "src/components/Common/HighlightFrame";
import { useLab } from "src/hooks/useLab";
import { useObservable } from "src/hooks/useObservable";

export const ProviderCalls: React.FunctionComponent = () => {
  const lab = useLab();
  const { calls } = useObservable(lab.world);
  const { provider } = useObservable(lab.runtime);

  return (
    <HighlightFrame target="provider-calls">
      <section
        aria-label="Provider calls"
        className={clsx("flex items-center gap-4 p-4", CARD_CLASS_NAME)}
      >
        <div className="mr-auto flex min-w-0 flex-col gap-0.5">
          <h3 className="font-semibold">
            Calls into {provider.name}&apos;s SDK
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Every call Harbor or Anchor makes counts. Watching counts nothing.
          </p>
        </div>
        <output
          aria-label="Provider call count"
          className="font-mono text-2xl font-semibold tabular-nums"
        >
          {calls}
        </output>
      </section>
    </HighlightFrame>
  );
};
