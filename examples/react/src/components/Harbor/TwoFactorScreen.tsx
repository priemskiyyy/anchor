import { ShieldCheck } from "@phosphor-icons/react";
import type React from "react";

import { buttonStyles } from "example-shared/ui/styles/buttonStyles";
import { HarborNoticeLine } from "src/components/Harbor/HarborNoticeLine";
import { useLab } from "src/hooks/useLab";
import { useObservable } from "src/hooks/useObservable";

export const TwoFactorScreen: React.FunctionComponent = () => {
  const lab = useLab();
  const { busy, notice } = useObservable(lab.harbor.view);

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-4 py-2 text-center">
      <ShieldCheck
        aria-hidden="true"
        size={40}
        weight="duotone"
        className="mx-auto text-amber-600 dark:text-amber-400"
      />
      <h3 className="text-xl font-semibold tracking-tight">
        Finish setting up two-factor
      </h3>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Your organization asks for a second factor before Harbor opens. Your
        session is kept, and it mints no tokens until then.
      </p>
      <button
        type="button"
        disabled={busy !== null}
        onClick={lab.harbor.completeAction}
        className={buttonStyles({ variant: "primary" })}
      >
        {busy?.kind === "action" ? "Setting up…" : "Set up two-factor"}
      </button>
      <HarborNoticeLine notice={notice} />
    </div>
  );
};
