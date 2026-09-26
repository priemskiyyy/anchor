import type { ObservableValue } from "@priemskiyyy/anchor";
import { computed, onMounted, onWatcherCleanup, shallowRef, watch } from "vue";
import type { ComputedRef, ShallowRef } from "vue";

export const useObservableValue = <TValue, TSelection>(
  observable: () => ObservableValue<TValue>,
  initial: TValue,
  select: (value: TValue) => TSelection,
): ComputedRef<TSelection> => {
  // Annotated, because `shallowRef` answers a generic with a conditional type that reads as `any`.
  const snapshot: ShallowRef<TValue> = shallowRef(initial);

  // Subscribed once mounted, so the server and the hydrating client both render `initial`.
  onMounted(() => {
    watch(
      observable,
      (current) => {
        snapshot.value = current.get();
        onWatcherCleanup(
          current.subscribe(() => {
            snapshot.value = current.get();
          }),
        );
      },
      { immediate: true, flush: "sync" },
    );
  });

  return computed(() => select(snapshot.value));
};
