<script lang="ts">
  import type { RegisteredSession } from "@priemskiyyy/anchor-svelte";
  import { describeCredential } from "example-shared/formatting/describeCredential";
  import { describeSlowLoad } from "example-shared/formatting/describeSlowLoad";
  import { formatShortKey } from "example-shared/formatting/formatShortKey";
  import { buttonStyles } from "example-shared/ui/styles/buttonStyles";
  import { monogramStyles } from "example-shared/ui/styles/monogramStyles";
  import {
    ORGANIZATION_IDS,
    ORGANIZATIONS,
  } from "example-shared/world/constants/organizations";
  import { OTHER_PEOPLE, PEOPLE } from "example-shared/world/constants/people";
  import { getPersonByEmail } from "example-shared/world/getPersonByEmail";
  import NoticeLine from "src/components/Harbor/NoticeLine.svelte";
  import { useLab } from "src/utilities/useLab";
  import { useObservable } from "src/utilities/useObservable.svelte";

  type Props = { session: RegisteredSession };

  let { session }: Props = $props();
  const lab = useLab();
  const view = useObservable(() => lab.harbor.view);
  const runtime = useObservable(() => lab.runtime);
  const person = $derived(getPersonByEmail(session.user.email));
  const workspace = $derived(view.current.workspaces[session.key]);

  const organization = $derived(
    workspace?.status === "ready" ? workspace.organization.id : "",
  );

  const loading = $derived(
    workspace === undefined || workspace.status === "loading",
  );

  const handleOrganizationChange = (event: Event) => {
    if (!(event.currentTarget instanceof HTMLSelectElement)) {
      return;
    }

    const { value } = event.currentTarget;
    const next = ORGANIZATION_IDS.find((id) => id === value);

    if (next === undefined) {
      return;
    }

    lab.harbor.switchOrganization(next);
  };
</script>

{#if person !== null}
  <div class="flex flex-col gap-4">
    <div class="flex flex-col gap-3">
      <div class="flex flex-wrap items-center gap-3">
        <span
          aria-hidden="true"
          class={monogramStyles({ tone: PEOPLE[person].tone, shape: "round" })}
        >
          {PEOPLE[person].initials}
        </span>
        <div class="mr-auto min-w-0">
          <p class="truncate font-semibold">{session.user.name}</p>
          <p class="truncate text-sm text-zinc-500 dark:text-zinc-400">
            {session.user.email}
          </p>
        </div>
        <div class="flex flex-col items-start gap-1">
          <label class="flex items-center gap-2 text-sm">
            <span class="font-medium text-zinc-600 dark:text-zinc-400">
              Organization
            </span>
            <select
              value={organization}
              disabled={!runtime.current.provider.capabilities.organizations ||
                organization === "" ||
                view.current.busy !== null}
              onchange={handleOrganizationChange}
              class="h-8 rounded-lg border border-zinc-300 bg-white px-2 text-sm disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900"
            >
              {#if organization === ""}
                <option value="">Loading…</option>
              {/if}
              {#each ORGANIZATION_IDS as id (id)}
                <option value={id}>{ORGANIZATIONS[id].name}</option>
              {/each}
            </select>
          </label>
          {#if !runtime.current.provider.capabilities.organizations}
            <p class="text-xs text-zinc-500 dark:text-zinc-400">
              {runtime.current.provider.label} sessions name no organization.
            </p>
          {/if}
        </div>
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={view.current.busy !== null}
          class={buttonStyles({ size: "small" })}
          onclick={() => lab.harbor.rename(session)}
        >
          {session.user.name === PEOPLE[person].name
            ? "Use short name"
            : "Use full name"}
        </button>
        <button
          type="button"
          disabled={view.current.busy !== null}
          class={buttonStyles({ size: "small" })}
          onclick={() => lab.harbor.signIn(OTHER_PEOPLE[person])}
        >
          Switch to {PEOPLE[OTHER_PEOPLE[person]].firstName}
        </button>
        <button
          type="button"
          disabled={view.current.busy !== null}
          class={buttonStyles({ variant: "primary", size: "small" })}
          onclick={() => lab.harbor.signOut(session)}
        >
          {view.current.busy?.kind === "sign-out" ? "Signing out…" : "Sign out"}
        </button>
      </div>
      <NoticeLine notice={view.current.notice} />
    </div>
    <section
      aria-label="Projects"
      class="flex flex-col gap-3 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
    >
      <div class="flex flex-wrap items-center gap-2">
        <h3 class="mr-auto font-semibold">
          Projects
          {#if workspace?.status === "ready"}
            <span class="font-normal text-zinc-500 dark:text-zinc-400">
              in {workspace.organization.name}
            </span>
          {/if}
        </h3>
        <button
          type="button"
          disabled={loading}
          class={buttonStyles({ size: "small" })}
          onclick={() => lab.harbor.loadProjects(session, { slowly: false })}
        >
          Reload
        </button>
        <button
          type="button"
          disabled={loading}
          class={buttonStyles({ size: "small" })}
          onclick={() => lab.harbor.loadProjects(session, { slowly: true })}
        >
          Load slowly
        </button>
      </div>
      {#if workspace?.status === "ready"}
        <ul aria-label="Project list" class="flex flex-col gap-1.5">
          {#each workspace.projects as project (project.id)}
            <li
              class="flex items-center justify-between rounded-lg bg-zinc-100 px-3 py-2 text-sm dark:bg-zinc-800/70"
            >
              <span class="font-medium">{project.name}</span>
              <span class="text-zinc-500 dark:text-zinc-400">
                {project.notes} notes
              </span>
            </li>
          {/each}
        </ul>
        <p class="text-xs text-zinc-500 dark:text-zinc-400">
          {describeCredential(workspace.credential)}
        </p>
      {:else if workspace?.status === "failed"}
        <p
          role="status"
          class="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/60 dark:text-amber-200"
        >
          {workspace.message}
        </p>
      {:else}
        <p
          role="status"
          class="text-sm text-zinc-500 motion-safe:animate-pulse"
        >
          {workspace?.status === "loading" && workspace.slowly
            ? describeSlowLoad(runtime.current.provider)
            : "Loading projects…"}
        </p>
      {/if}
      <p class="text-xs text-zinc-500 dark:text-zinc-400">
        Cached under session key
        <span class="font-mono">{formatShortKey(session.key)}</span>, so no
        other session can ever see this list.
      </p>
    </section>
  </div>
{/if}
