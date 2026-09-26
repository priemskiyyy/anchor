<script lang="ts">
  import { describeEndResult } from "example-shared/formatting/describeEndResult";
  import { buttonStyles } from "example-shared/ui/styles/buttonStyles";
  import { monogramStyles } from "example-shared/ui/styles/monogramStyles";
  import { PEOPLE, PERSON_IDS } from "example-shared/world/constants/people";
  import NoticeLine from "src/components/Harbor/NoticeLine.svelte";
  import { useLab } from "src/utilities/useLab";
  import { useObservable } from "src/utilities/useObservable.svelte";

  const lab = useLab();
  const view = useObservable(() => lab.harbor.view);

  const signingIn = $derived(
    view.current.busy?.kind === "sign-in" ? view.current.busy.person : null,
  );
</script>

<div class="mx-auto flex max-w-sm flex-col gap-5 py-2">
  {#if view.current.ended !== null}
    {@const ended = view.current.ended}
    <div
      role="status"
      aria-label="Sign-out result"
      class="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm dark:border-zinc-800 dark:bg-zinc-900/60"
    >
      <p class="font-semibold">You signed out.</p>
      <ul class="flex flex-col gap-1 text-zinc-700 dark:text-zinc-300">
        {#each describeEndResult(ended.result, ended.provider) as line (line)}
          <li>{line}</li>
        {/each}
      </ul>
      {#if ended.result.navigation !== null && ended.opened}
        <p class="text-emerald-700 dark:text-emerald-300">
          You opened {ended.provider.label}'s logout page, so its own session
          ended too.
        </p>
      {:else if ended.result.navigation !== null}
        <div class="flex flex-col gap-1.5">
          <button
            type="button"
            class={buttonStyles({ size: "small" })}
            onclick={lab.harbor.openLogoutPage}
          >
            Open {ended.provider.label}'s logout page
          </button>
          <code class="font-mono text-xs break-all text-zinc-500">
            {ended.result.navigation.url}
          </code>
        </div>
      {/if}
    </div>
  {/if}
  <div class="flex flex-col gap-1.5 text-center">
    <h3 class="text-xl font-semibold tracking-tight">Sign in to Harbor</h3>
    <p class="text-sm text-zinc-600 dark:text-zinc-400">
      Your team's notes, in one place.
    </p>
  </div>
  <div class="flex flex-col gap-2">
    {#each PERSON_IDS as person (person)}
      <button
        type="button"
        disabled={view.current.busy !== null}
        class={buttonStyles({ size: "regular" })}
        onclick={() => lab.harbor.signIn(person)}
      >
        <span
          aria-hidden="true"
          class={monogramStyles({ tone: PEOPLE[person].tone, shape: "tile" })}
        >
          {PEOPLE[person].initials}
        </span>
        {signingIn === person
          ? "Signing in…"
          : `Continue as ${PEOPLE[person].firstName}`}
      </button>
    {/each}
  </div>
  <NoticeLine notice={view.current.notice} />
</div>
