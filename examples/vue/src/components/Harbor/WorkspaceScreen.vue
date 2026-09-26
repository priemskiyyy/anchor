<script setup lang="ts">
import type { RegisteredSession } from "@priemskiyyy/anchor-vue";
import { computed } from "vue";

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
import { useLab } from "src/composables/useLab";
import { useObservable } from "src/composables/useObservable";

const props = defineProps<{ session: RegisteredSession }>();

const lab = useLab();
const view = useObservable(lab.harbor.view);
const runtime = useObservable(lab.runtime);
const person = computed(() => getPersonByEmail(props.session.user.email));
const workspace = computed(() => view.value.workspaces[props.session.key]);

const organization = computed(() =>
  workspace.value?.status === "ready" ? workspace.value.organization.id : "",
);

const organizationLocked = computed(
  () =>
    !runtime.value.provider.capabilities.organizations ||
    organization.value === "" ||
    view.value.busy !== null,
);

const handleOrganizationChange = (event: Event) => {
  if (!(event.target instanceof HTMLSelectElement)) {
    return;
  }

  const { value } = event.target;
  const next = ORGANIZATION_IDS.find((id) => id === value);

  if (next === undefined) {
    return;
  }

  lab.harbor.switchOrganization(next);
};
</script>

<template>
  <div v-if="person !== null" class="flex flex-col gap-4">
    <div class="flex flex-col gap-3">
      <div class="flex flex-wrap items-center gap-3">
        <span
          aria-hidden="true"
          :class="monogramStyles({ tone: PEOPLE[person].tone, shape: 'round' })"
        >
          {{ PEOPLE[person].initials }}
        </span>
        <div class="mr-auto min-w-0">
          <p class="truncate font-semibold">{{ session.user.name }}</p>
          <p class="truncate text-sm text-zinc-500 dark:text-zinc-400">
            {{ session.user.email }}
          </p>
        </div>
        <div class="flex flex-col items-start gap-1">
          <label class="flex items-center gap-2 text-sm">
            <span class="font-medium text-zinc-600 dark:text-zinc-400">
              Organization
            </span>
            <select
              :value="organization"
              :disabled="organizationLocked"
              class="h-8 rounded-lg border border-zinc-300 bg-white px-2 text-sm disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900"
              @change="handleOrganizationChange"
            >
              <option v-if="organization === ''" value="">Loading…</option>
              <option v-for="id in ORGANIZATION_IDS" :key="id" :value="id">
                {{ ORGANIZATIONS[id].name }}
              </option>
            </select>
          </label>
          <p
            v-if="!runtime.provider.capabilities.organizations"
            class="text-xs text-zinc-500 dark:text-zinc-400"
          >
            {{ runtime.provider.label }} sessions name no organization.
          </p>
        </div>
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          :disabled="view.busy !== null"
          :class="buttonStyles({ size: 'small' })"
          @click="lab.harbor.rename(session)"
        >
          {{
            session.user.name === PEOPLE[person].name
              ? "Use short name"
              : "Use full name"
          }}
        </button>
        <button
          type="button"
          :disabled="view.busy !== null"
          :class="buttonStyles({ size: 'small' })"
          @click="lab.harbor.signIn(OTHER_PEOPLE[person])"
        >
          Switch to {{ PEOPLE[OTHER_PEOPLE[person]].firstName }}
        </button>
        <button
          type="button"
          :disabled="view.busy !== null"
          :class="buttonStyles({ variant: 'primary', size: 'small' })"
          @click="lab.harbor.signOut(session)"
        >
          {{ view.busy?.kind === "sign-out" ? "Signing out…" : "Sign out" }}
        </button>
      </div>
      <p
        v-if="view.notice !== null"
        role="status"
        class="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:bg-rose-950/60 dark:text-rose-200"
      >
        {{ view.notice }}
      </p>
    </div>
    <section
      aria-label="Projects"
      class="flex flex-col gap-3 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
    >
      <div class="flex flex-wrap items-center gap-2">
        <h3 class="mr-auto font-semibold">
          Projects
          <span
            v-if="workspace?.status === 'ready'"
            class="font-normal text-zinc-500 dark:text-zinc-400"
          >
            in {{ workspace.organization.name }}
          </span>
        </h3>
        <button
          type="button"
          :disabled="workspace === undefined || workspace.status === 'loading'"
          :class="buttonStyles({ size: 'small' })"
          @click="lab.harbor.loadProjects(session, { slowly: false })"
        >
          Reload
        </button>
        <button
          type="button"
          :disabled="workspace === undefined || workspace.status === 'loading'"
          :class="buttonStyles({ size: 'small' })"
          @click="lab.harbor.loadProjects(session, { slowly: true })"
        >
          Load slowly
        </button>
      </div>
      <p
        v-if="workspace === undefined || workspace.status === 'loading'"
        role="status"
        class="text-sm text-zinc-500 motion-safe:animate-pulse"
      >
        {{
          workspace?.status === "loading" && workspace.slowly
            ? describeSlowLoad(runtime.provider)
            : "Loading projects…"
        }}
      </p>
      <p
        v-else-if="workspace.status === 'failed'"
        role="status"
        class="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/60 dark:text-amber-200"
      >
        {{ workspace.message }}
      </p>
      <template v-else>
        <ul aria-label="Project list" class="flex flex-col gap-1.5">
          <li
            v-for="project in workspace.projects"
            :key="project.id"
            class="flex items-center justify-between rounded-lg bg-zinc-100 px-3 py-2 text-sm dark:bg-zinc-800/70"
          >
            <span class="font-medium">{{ project.name }}</span>
            <span class="text-zinc-500 dark:text-zinc-400">
              {{ project.notes }} notes
            </span>
          </li>
        </ul>
        <p class="text-xs text-zinc-500 dark:text-zinc-400">
          {{ describeCredential(workspace.credential) }}
        </p>
      </template>
      <p class="text-xs text-zinc-500 dark:text-zinc-400">
        Cached under session key {{ formatShortKey(session.key) }}, so no other
        session can ever see this list.
      </p>
    </section>
  </div>
</template>
