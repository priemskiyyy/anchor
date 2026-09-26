import { CloudX } from "@phosphor-icons/react";
import type React from "react";

import { buttonStyles } from "example-shared/ui/styles/buttonStyles";
import { HarborNoticeLine } from "src/components/Harbor/HarborNoticeLine";
import { useLab } from "src/hooks/useLab";
import { useObservable } from "src/hooks/useObservable";

export const UnavailableScreen: React.FunctionComponent = () => {
  const lab = useLab();
  const { busy, notice } = useObservable(lab.harbor.view);
  const { provider } = useObservable(lab.runtime);

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-4 py-2 text-center">
      <CloudX
        aria-hidden="true"
        size={40}
        weight="duotone"
        className="mx-auto text-rose-600 dark:text-rose-400"
      />
      <h3 className="text-xl font-semibold tracking-tight">
        We can&apos;t reach the sign-in service
      </h3>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Harbor cannot tell whether you are signed in, so it signs nobody out.
        Try again once the network is back.
      </p>
      <button
        type="button"
        disabled={busy !== null}
        onClick={lab.harbor.retry}
        className={buttonStyles({ variant: "primary" })}
      >
        {busy?.kind === "retry" ? "Retrying…" : "Retry"}
      </button>
      {provider.capabilities.retry === "reload" ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {provider.label} initializes once per page, so only Reload Harbor,
          above, tries again.
        </p>
      ) : null}
      <HarborNoticeLine notice={notice} />
    </div>
  );
};
