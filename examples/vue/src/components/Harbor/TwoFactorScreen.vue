<script setup lang="ts">
import { buttonStyles } from "example-shared/ui/styles/buttonStyles";
import { useLab } from "src/composables/useLab";
import { useObservable } from "src/composables/useObservable";

const lab = useLab();
const view = useObservable(lab.harbor.view);
</script>

<template>
  <div class="mx-auto flex max-w-sm flex-col gap-4 py-2 text-center">
    <h3 class="text-xl font-semibold tracking-tight">
      Finish setting up two-factor
    </h3>
    <p class="text-sm text-zinc-600 dark:text-zinc-400">
      Your organization asks for a second factor before Harbor opens. Your
      session is kept, and it mints no tokens until then.
    </p>
    <button
      type="button"
      :disabled="view.busy !== null"
      :class="buttonStyles({ variant: 'primary' })"
      @click="lab.harbor.completeAction"
    >
      {{ view.busy?.kind === "action" ? "Setting up…" : "Set up two-factor" }}
    </button>
  </div>
</template>
