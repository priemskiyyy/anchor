<script lang="ts">
  import { buttonStyles } from "example-shared/ui/styles/buttonStyles";
  import NoticeLine from "src/components/Harbor/NoticeLine.svelte";
  import { useLab } from "src/utilities/useLab";
  import { useObservable } from "src/utilities/useObservable.svelte";

  const lab = useLab();
  const view = useObservable(() => lab.harbor.view);
  const runtime = useObservable(() => lab.runtime);
</script>

<div class="mx-auto flex max-w-sm flex-col gap-4 py-2 text-center">
  <h3 class="text-xl font-semibold tracking-tight">
    We can't reach the sign-in service
  </h3>
  <p class="text-sm text-zinc-600 dark:text-zinc-400">
    Harbor cannot tell whether you are signed in, so it signs nobody out. Try
    again once the network is back.
  </p>
  <button
    type="button"
    disabled={view.current.busy !== null}
    class={buttonStyles({ variant: "primary" })}
    onclick={lab.harbor.retry}
  >
    {view.current.busy?.kind === "retry" ? "Retrying…" : "Retry"}
  </button>
  {#if runtime.current.provider.capabilities.retry === "reload"}
    <p class="text-sm text-zinc-600 dark:text-zinc-400">
      {runtime.current.provider.label} initializes once per page, so only Reload Harbor,
      above, tries again.
    </p>
  {/if}
  <NoticeLine notice={view.current.notice} />
</div>
