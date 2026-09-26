import type { Component } from "solid-js";
import { Show } from "solid-js";

import { buttonStyles } from "example-shared/ui/styles/buttonStyles";
import { NoticeLine } from "src/components/Harbor/NoticeLine";
import { useLab } from "src/primitives/useLab";
import { useObservable } from "src/primitives/useObservable";

export const UnavailableScreen: Component = () => {
  const lab = useLab();
  const view = useObservable(lab.harbor.view);
  const runtime = useObservable(lab.runtime);

  return (
    <div class="mx-auto flex max-w-sm flex-col gap-4 py-2 text-center">
      <h3 class="text-xl font-semibold tracking-tight">
        We can't reach the sign-in service
      </h3>
      <p class="text-sm text-zinc-600 dark:text-zinc-400">
        Harbor cannot tell whether you are signed in, so it signs nobody out.
        Try again once the network is back.
      </p>
      <button
        type="button"
        disabled={view().busy !== null}
        onClick={lab.harbor.retry}
        class={buttonStyles({ variant: "primary" })}
      >
        {view().busy?.kind === "retry" ? "Retrying…" : "Retry"}
      </button>
      <Show when={runtime().provider.capabilities.retry === "reload"}>
        <p class="text-sm text-zinc-600 dark:text-zinc-400">
          {runtime().provider.label} initializes once per page, so only Reload
          Harbor, above, tries again.
        </p>
      </Show>
      <NoticeLine notice={view().notice} />
    </div>
  );
};
