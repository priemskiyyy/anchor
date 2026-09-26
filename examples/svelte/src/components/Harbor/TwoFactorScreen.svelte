<script lang="ts">
  import { buttonStyles } from "example-shared/ui/styles/buttonStyles";
  import { useLab } from "src/utilities/useLab";
  import { useObservable } from "src/utilities/useObservable.svelte";

  const lab = useLab();
  const view = useObservable(() => lab.harbor.view);
</script>

<div class="mx-auto flex max-w-sm flex-col gap-4 py-2 text-center">
  <h3 class="text-xl font-semibold tracking-tight">
    Finish setting up two-factor
  </h3>
  <p class="text-sm text-zinc-600 dark:text-zinc-400">
    Your organization asks for a second factor before Harbor opens. Your session
    is kept, and it mints no tokens until then.
  </p>
  <button
    type="button"
    disabled={view.current.busy !== null}
    class={buttonStyles({ variant: "primary" })}
    onclick={lab.harbor.completeAction}
  >
    {view.current.busy?.kind === "action" ? "Setting up…" : "Set up two-factor"}
  </button>
</div>
