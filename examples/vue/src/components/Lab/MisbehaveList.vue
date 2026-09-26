<script setup lang="ts">
import { useSession } from "@priemskiyyy/anchor-vue";
import { computed } from "vue";

import { getMisbehaviorRows } from "example-shared/lab/getMisbehaviorRows";
import { buttonStyles } from "example-shared/ui/styles/buttonStyles";
import { CARD_CLASS_NAME } from "example-shared/ui/styles/cardStyles";
import { useLab } from "src/composables/useLab";
import { useObservable } from "src/composables/useObservable";

const lab = useLab();
const runtime = useObservable(lab.runtime);
const world = useObservable(lab.world);
const misbehaving = useObservable(lab.misbehaving);
const status = useSession((state) => state.status);

const rows = computed(() =>
  getMisbehaviorRows(runtime.value.provider, status.value, world.value),
);
</script>

<template>
  <section
    aria-labelledby="misbehave-title"
    class="flex flex-col gap-3 p-4"
    :class="CARD_CLASS_NAME"
  >
    <h2 id="misbehave-title" class="text-lg font-semibold tracking-tight">
      Make the provider misbehave
    </h2>
    <ul class="flex flex-col gap-2">
      <li
        v-for="row in rows"
        :key="row.misbehavior.id"
        class="flex flex-col gap-1"
      >
        <button
          type="button"
          :role="row.misbehavior.kind === 'switch' ? 'switch' : undefined"
          :aria-checked="row.misbehavior.kind === 'switch' ? row.on : undefined"
          :aria-describedby="`misbehavior-${row.misbehavior.id}`"
          :disabled="misbehaving !== null || !row.available"
          :class="buttonStyles({ size: 'block', pressed: row.on })"
          @click="lab.misbehave(row.misbehavior.id)"
        >
          {{ row.misbehavior.label }}
        </button>
        <p
          :id="`misbehavior-${row.misbehavior.id}`"
          class="text-sm text-zinc-600 dark:text-zinc-400"
        >
          {{ row.note }}
        </p>
      </li>
    </ul>
  </section>
</template>
