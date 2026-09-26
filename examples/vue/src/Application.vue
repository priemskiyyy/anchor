<script setup lang="ts">
import { AnchorDevtools } from "@priemskiyyy/anchor-devtools/vue";
import { AnchorProvider } from "@priemskiyyy/anchor-vue";
import { provide } from "vue";

import type { SessionLab } from "example-shared/lab/types/SessionLab";
import { PAGE_CLASS_NAME } from "example-shared/ui/styles/pageStyles";
import AppWindow from "src/components/Harbor/AppWindow.vue";
import MisbehaveList from "src/components/Lab/MisbehaveList.vue";
import SessionCard from "src/components/Lab/SessionCard.vue";
import TopBar from "src/components/Lab/TopBar.vue";
import { useObservable } from "src/composables/useObservable";
import { LAB_KEY } from "src/utils/constants/lab";

const props = defineProps<{ lab: SessionLab }>();

provide(LAB_KEY, props.lab);

const runtime = useObservable(props.lab.runtime);
</script>

<template>
  <AnchorProvider :key="runtime.id" :anchor="runtime.anchor">
    <TopBar />
    <main
      class="grid items-start gap-6 pt-6 pb-28 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]"
      :class="PAGE_CLASS_NAME"
    >
      <AppWindow />
      <div class="flex min-w-0 flex-col gap-6">
        <SessionCard />
        <MisbehaveList />
      </div>
    </main>
    <AnchorDevtools />
  </AnchorProvider>
</template>
