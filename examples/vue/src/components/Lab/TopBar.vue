<script setup lang="ts">
import { buttonStyles } from "example-shared/ui/styles/buttonStyles";
import { monogramStyles } from "example-shared/ui/styles/monogramStyles";
import { useLab } from "src/composables/useLab";
import { useObservable } from "src/composables/useObservable";

const lab = useLab();
const runtime = useObservable(lab.runtime);

const handleProviderChange = (event: Event) => {
  if (!(event.target instanceof HTMLSelectElement)) {
    return;
  }

  lab.selectProvider(event.target.value);
};

const handleResetClick = () => {
  lab.reset();
};
</script>

<template>
  <header
    class="border-b border-zinc-200/70 bg-white/60 dark:border-zinc-800 dark:bg-zinc-950/60"
  >
    <div
      class="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 sm:px-6"
    >
      <div class="mr-auto min-w-0">
        <h1 class="text-lg leading-tight font-semibold">Session Lab on Vue</h1>
        <p class="text-sm text-zinc-600 dark:text-zinc-400">
          Harbor over real Anchor adapters, in Vue's own idiom.
        </p>
      </div>
      <label class="flex items-center gap-2 text-sm">
        <span class="font-medium text-zinc-700 dark:text-zinc-300">
          Provider
        </span>
        <span
          aria-hidden="true"
          :class="
            monogramStyles({ tone: runtime.provider.icon.tone, shape: 'tile' })
          "
        >
          {{ runtime.provider.icon.monogram }}
        </span>
        <select
          :value="runtime.provider.id"
          class="h-9 rounded-lg border border-zinc-300 bg-white px-2 text-sm font-medium shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
          @change="handleProviderChange"
        >
          <option
            v-for="entry in lab.catalog"
            :key="entry.id"
            :value="entry.id"
          >
            {{ entry.label }}
          </option>
        </select>
      </label>
      <button
        type="button"
        :class="buttonStyles({ size: 'small' })"
        @click="handleResetClick"
      >
        Reset
      </button>
    </div>
  </header>
</template>
