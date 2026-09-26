<script setup lang="ts">
import { describeEndResult } from "example-shared/formatting/describeEndResult";
import { buttonStyles } from "example-shared/ui/styles/buttonStyles";
import { monogramStyles } from "example-shared/ui/styles/monogramStyles";
import { PEOPLE, PERSON_IDS } from "example-shared/world/constants/people";
import { useLab } from "src/composables/useLab";
import { useObservable } from "src/composables/useObservable";

const lab = useLab();
const view = useObservable(lab.harbor.view);
</script>

<template>
  <div class="mx-auto flex max-w-sm flex-col gap-5 py-2">
    <div
      v-if="view.ended !== null"
      role="status"
      aria-label="Sign-out result"
      class="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm dark:border-zinc-800 dark:bg-zinc-900/60"
    >
      <p class="font-semibold">You signed out.</p>
      <ul class="flex flex-col gap-1 text-zinc-700 dark:text-zinc-300">
        <li
          v-for="line in describeEndResult(
            view.ended.result,
            view.ended.provider,
          )"
          :key="line"
        >
          {{ line }}
        </li>
      </ul>
      <p
        v-if="view.ended.result.navigation !== null && view.ended.opened"
        class="text-emerald-700 dark:text-emerald-300"
      >
        You opened {{ view.ended.provider.label }}'s logout page, so its own
        session ended too.
      </p>
      <div
        v-else-if="view.ended.result.navigation !== null"
        class="flex flex-col gap-1.5"
      >
        <button
          type="button"
          :class="buttonStyles({ size: 'small' })"
          @click="lab.harbor.openLogoutPage"
        >
          Open {{ view.ended.provider.label }}'s logout page
        </button>
        <code class="font-mono text-xs break-all text-zinc-500">
          {{ view.ended.result.navigation.url }}
        </code>
      </div>
    </div>
    <div class="flex flex-col gap-1.5 text-center">
      <h3 class="text-xl font-semibold tracking-tight">Sign in to Harbor</h3>
      <p class="text-sm text-zinc-600 dark:text-zinc-400">
        Your team's notes, in one place.
      </p>
    </div>
    <div class="flex flex-col gap-2">
      <button
        v-for="person in PERSON_IDS"
        :key="person"
        type="button"
        :disabled="view.busy !== null"
        :class="buttonStyles({ size: 'regular' })"
        @click="lab.harbor.signIn(person)"
      >
        <span
          aria-hidden="true"
          :class="monogramStyles({ tone: PEOPLE[person].tone, shape: 'tile' })"
        >
          {{ PEOPLE[person].initials }}
        </span>
        {{
          view.busy?.kind === "sign-in" && view.busy.person === person
            ? "Signing in…"
            : `Continue as ${PEOPLE[person].firstName}`
        }}
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
</template>
