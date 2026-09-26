<script setup lang="ts">
import { useAnchor, useSession } from "@priemskiyyy/anchor-vue";
import { computed } from "vue";

import { STATUS_LABELS } from "example-shared/lab/constants/labels";
import { CARD_CLASS_NAME } from "example-shared/ui/styles/cardStyles";
import {
  FIELD_LABEL_CLASS_NAME,
  FIELD_VALUE_CLASS_NAME,
} from "example-shared/ui/styles/fieldStyles";
import { getAcceptedSession } from "example-shared/utils/getAcceptedSession";
import { useLab } from "src/composables/useLab";
import { useObservable } from "src/composables/useObservable";

const state = useSession();
const diagnostics = useObservable(useAnchor().diagnostics);
const change = useObservable(useLab().sessionChange);

const fields = computed(() => {
  const session = getAcceptedSession(state.value);

  return [
    { id: "status", label: "Status", value: STATUS_LABELS[state.value.status] },
    { id: "key", label: "Key", value: session?.key ?? "none" },
    {
      id: "generation",
      label: "Generation",
      value: `#${diagnostics.value.session.generation}`,
    },
    {
      id: "authority",
      label: "Authority",
      value: session?.principal.authority ?? "none",
    },
    {
      id: "subject",
      label: "Subject",
      value: session?.principal.subject ?? "none",
    },
  ];
});
</script>

<template>
  <section
    aria-label="Session"
    class="flex flex-col gap-3 p-4"
    :class="CARD_CLASS_NAME"
  >
    <h2 class="text-lg font-semibold tracking-tight">What Anchor sees</h2>
    <dl
      class="grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-4 gap-y-1.5"
    >
      <template v-for="field in fields" :key="field.id">
        <dt :id="`session-${field.id}`" :class="FIELD_LABEL_CLASS_NAME">
          {{ field.label }}
        </dt>
        <dd
          :aria-labelledby="`session-${field.id}`"
          :class="FIELD_VALUE_CLASS_NAME"
        >
          {{ field.value }}
        </dd>
      </template>
    </dl>
    <div role="status" aria-label="Key change">
      <p
        v-if="change !== null"
        :key="change.id"
        class="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-900 motion-safe:animate-flash dark:bg-blue-950/50 dark:text-blue-200"
      >
        {{ change.reason }}
      </p>
    </div>
  </section>
</template>
