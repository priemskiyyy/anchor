<script lang="ts">
  import { useSession } from "@priemskiyyy/anchor-svelte";
  import { describeCapabilities } from "example-shared/formatting/describeCapabilities";
  import { buttonStyles } from "example-shared/ui/styles/buttonStyles";
  import { CARD_CLASS_NAME } from "example-shared/ui/styles/cardStyles";
  import SignInScreen from "src/components/Harbor/SignInScreen.svelte";
  import TwoFactorScreen from "src/components/Harbor/TwoFactorScreen.svelte";
  import UnavailableScreen from "src/components/Harbor/UnavailableScreen.svelte";
  import WorkspaceScreen from "src/components/Harbor/WorkspaceScreen.svelte";
  import { useLab } from "src/utilities/useLab";
  import { useObservable } from "src/utilities/useObservable.svelte";

  const lab = useLab();
  const runtime = useObservable(() => lab.runtime);
  const state = useSession();

  const handleReloadClick = () => {
    lab.reload();
  };
</script>

<section aria-labelledby="your-app-title" class="flex min-w-0 flex-col gap-3">
  <div class="flex flex-col gap-0.5">
    <h2 id="your-app-title" class="text-lg font-semibold tracking-tight">
      Your app
    </h2>
    <p class="text-sm text-zinc-600 dark:text-zinc-400">
      Harbor, a team notes app. Its screens come from useSession() alone.
    </p>
  </div>
  <div class="overflow-hidden {CARD_CLASS_NAME}">
    <div
      class="flex items-center gap-2 border-b border-zinc-200 bg-zinc-100/80 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <span
        class="min-w-0 truncate rounded-md bg-white px-2 py-0.5 font-mono text-xs text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400"
      >
        harbor.example
      </span>
      <button
        type="button"
        class="ml-auto {buttonStyles({ variant: 'ghost', size: 'small' })}"
        onclick={handleReloadClick}
      >
        Reload Harbor
      </button>
    </div>
    <div class="min-h-[22rem] p-4 sm:p-5">
      {#if state.current.status === "initializing"}
        <div role="status" class="flex flex-col gap-4">
          <p class="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Restoring your session
          </p>
          <div
            class="h-24 rounded-xl bg-zinc-200/70 motion-safe:animate-pulse dark:bg-zinc-800/70"
          ></div>
        </div>
      {:else if state.current.status === "signed-out"}
        <SignInScreen />
      {:else if state.current.status === "action-required"}
        <TwoFactorScreen />
      {:else if state.current.status === "unavailable"}
        <UnavailableScreen />
      {:else}
        <WorkspaceScreen session={state.current.session} />
      {/if}
    </div>
    <p
      class="border-t border-zinc-200 px-4 py-2 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400"
    >
      <span class="font-medium text-zinc-700 dark:text-zinc-300">
        On {runtime.current.provider.name}:
      </span>
      {describeCapabilities(runtime.current.provider).join(" · ")}
    </p>
  </div>
</section>
