import type { RegisteredSession } from "@priemskiyyy/anchor-solid";
import type { Component } from "solid-js";
import { For, Match, Show, Switch } from "solid-js";

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
import { NoticeLine } from "src/components/Harbor/NoticeLine";
import { useLab } from "src/primitives/useLab";
import { useObservable } from "src/primitives/useObservable";

type WorkspaceScreenProps = { session: RegisteredSession };

export const WorkspaceScreen: Component<WorkspaceScreenProps> = (props) => {
  const lab = useLab();
  const view = useObservable(lab.harbor.view);
  const runtime = useObservable(lab.runtime);
  const getWorkspace = () => view().workspaces[props.session.key];

  const getOrganization = () => {
    const workspace = getWorkspace();

    return workspace?.status === "ready" ? workspace.organization.id : "";
  };

  const isLoading = () => {
    const workspace = getWorkspace();

    return workspace === undefined || workspace.status === "loading";
  };

  const isLoadingSlowly = () => {
    const workspace = getWorkspace();

    return workspace?.status === "loading" && workspace.slowly;
  };

  const getReadyWorkspace = () => {
    const workspace = getWorkspace();

    return workspace?.status === "ready" ? workspace : null;
  };

  const getFailure = () => {
    const workspace = getWorkspace();

    return workspace?.status === "failed" ? workspace.message : null;
  };

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

  return (
    <Show when={getPersonByEmail(props.session.user.email)}>
      {(person) => (
        <div class="flex flex-col gap-4">
          <div class="flex flex-col gap-3">
            <div class="flex flex-wrap items-center gap-3">
              <span
                aria-hidden="true"
                class={monogramStyles({
                  tone: PEOPLE[person()].tone,
                  shape: "round",
                })}
              >
                {PEOPLE[person()].initials}
              </span>
              <div class="mr-auto min-w-0">
                <p class="truncate font-semibold">{props.session.user.name}</p>
                <p class="truncate text-sm text-zinc-500 dark:text-zinc-400">
                  {props.session.user.email}
                </p>
              </div>
              <div class="flex flex-col items-start gap-1">
                <label class="flex items-center gap-2 text-sm">
                  <span class="font-medium text-zinc-600 dark:text-zinc-400">
                    Organization
                  </span>
                  <select
                    disabled={
                      !runtime().provider.capabilities.organizations ||
                      getOrganization() === "" ||
                      view().busy !== null
                    }
                    onChange={handleOrganizationChange}
                    class="h-8 rounded-lg border border-zinc-300 bg-white px-2 text-sm disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900"
                  >
                    <Show when={getOrganization() === ""}>
                      <option value="" selected>
                        Loading…
                      </option>
                    </Show>
                    <For each={ORGANIZATION_IDS}>
                      {(id) => (
                        <option value={id} selected={id === getOrganization()}>
                          {ORGANIZATIONS[id].name}
                        </option>
                      )}
                    </For>
                  </select>
                </label>
                <Show when={!runtime().provider.capabilities.organizations}>
                  <p class="text-xs text-zinc-500 dark:text-zinc-400">
                    {runtime().provider.label} sessions name no organization.
                  </p>
                </Show>
              </div>
            </div>
            <div class="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={view().busy !== null}
                onClick={() => lab.harbor.rename(props.session)}
                class={buttonStyles({ size: "small" })}
              >
                {props.session.user.name === PEOPLE[person()].name
                  ? "Use short name"
                  : "Use full name"}
              </button>
              <button
                type="button"
                disabled={view().busy !== null}
                onClick={() => lab.harbor.signIn(OTHER_PEOPLE[person()])}
                class={buttonStyles({ size: "small" })}
              >
                Switch to {PEOPLE[OTHER_PEOPLE[person()]].firstName}
              </button>
              <button
                type="button"
                disabled={view().busy !== null}
                onClick={() => lab.harbor.signOut(props.session)}
                class={buttonStyles({ variant: "primary", size: "small" })}
              >
                {view().busy?.kind === "sign-out" ? "Signing out…" : "Sign out"}
              </button>
            </div>
            <NoticeLine notice={view().notice} />
          </div>
          <section
            aria-label="Projects"
            class="flex flex-col gap-3 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
          >
            <div class="flex flex-wrap items-center gap-2">
              <h3 class="mr-auto font-semibold">
                Projects
                <Show when={getReadyWorkspace()}>
                  {(workspace) => (
                    <span class="font-normal text-zinc-500 dark:text-zinc-400">
                      {" "}
                      in {workspace().organization.name}
                    </span>
                  )}
                </Show>
              </h3>
              <button
                type="button"
                disabled={isLoading()}
                onClick={() =>
                  lab.harbor.loadProjects(props.session, { slowly: false })
                }
                class={buttonStyles({ size: "small" })}
              >
                Reload
              </button>
              <button
                type="button"
                disabled={isLoading()}
                onClick={() =>
                  lab.harbor.loadProjects(props.session, { slowly: true })
                }
                class={buttonStyles({ size: "small" })}
              >
                Load slowly
              </button>
            </div>
            <Switch>
              <Match when={getReadyWorkspace()}>
                {(workspace) => (
                  <>
                    <ul aria-label="Project list" class="flex flex-col gap-1.5">
                      <For each={workspace().projects}>
                        {(project) => (
                          <li class="flex items-center justify-between rounded-lg bg-zinc-100 px-3 py-2 text-sm dark:bg-zinc-800/70">
                            <span class="font-medium">{project.name}</span>
                            <span class="text-zinc-500 dark:text-zinc-400">
                              {project.notes} notes
                            </span>
                          </li>
                        )}
                      </For>
                    </ul>
                    <p class="text-xs text-zinc-500 dark:text-zinc-400">
                      {describeCredential(workspace().credential)}
                    </p>
                  </>
                )}
              </Match>
              <Match when={getFailure()}>
                {(message) => (
                  <p
                    role="status"
                    class="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/60 dark:text-amber-200"
                  >
                    {message()}
                  </p>
                )}
              </Match>
              <Match when={isLoading()}>
                <p
                  role="status"
                  class="text-sm text-zinc-500 motion-safe:animate-pulse"
                >
                  {isLoadingSlowly()
                    ? describeSlowLoad(runtime().provider)
                    : "Loading projects…"}
                </p>
              </Match>
            </Switch>
            <p class="text-xs text-zinc-500 dark:text-zinc-400">
              Cached under session key{" "}
              <span class="font-mono">{formatShortKey(props.session.key)}</span>
              , so no other session can ever see this list.
            </p>
          </section>
        </div>
      )}
    </Show>
  );
};
