<script setup lang="ts">
import { buttonStyles } from "example-shared/ui/styles/buttonStyles";
import { useLab } from "src/composables/useLab";
import { useObservable } from "src/composables/useObservable";

const lab = useLab();
const view = useObservable(lab.harbor.view);
const runtime = useObservable(lab.runtime);
</script>

<template>
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
      :disabled="view.busy !== null"
      :class="buttonStyles({ variant: 'primary' })"
      @click="lab.harbor.retry"
    >
      {{ view.busy?.kind === "retry" ? "Retrying…" : "Retry" }}
    </button>
    <p
      v-if="runtime.provider.capabilities.retry === 'reload'"
      class="text-sm text-zinc-600 dark:text-zinc-400"
    >
      {{ runtime.provider.label }} initializes once per page, so only Reload
      Harbor, above, tries again.
    </p>
    <p
      v-if="view.notice !== null"
      role="status"
      class="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:bg-rose-950/60 dark:text-rose-200"
    >
      {{ view.notice }}
    </p>
  </div>
</template>
