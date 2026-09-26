import type { Component } from "solid-js";

import { buttonStyles } from "example-shared/ui/styles/buttonStyles";
import { useLab } from "src/primitives/useLab";
import { useObservable } from "src/primitives/useObservable";

export const TwoFactorScreen: Component = () => {
  const lab = useLab();
  const view = useObservable(lab.harbor.view);

  return (
    <div class="mx-auto flex max-w-sm flex-col gap-4 py-2 text-center">
      <h3 class="text-xl font-semibold tracking-tight">
        Finish setting up two-factor
      </h3>
      <p class="text-sm text-zinc-600 dark:text-zinc-400">
        Your organization asks for a second factor before Harbor opens. Your
        session is kept, and it mints no tokens until then.
      </p>
      <button
        type="button"
        disabled={view().busy !== null}
        onClick={lab.harbor.completeAction}
        class={buttonStyles({ variant: "primary" })}
      >
        {view().busy?.kind === "action" ? "Setting up…" : "Set up two-factor"}
      </button>
    </div>
  );
};
