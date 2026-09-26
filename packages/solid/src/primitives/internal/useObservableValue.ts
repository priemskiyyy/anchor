import type { ObservableValue } from "@priemskiyyy/anchor";
import {
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
} from "solid-js";
import type { Accessor } from "solid-js";

export const useObservableValue = <TValue, TSelection>(
  observable: Accessor<ObservableValue<TValue>>,
  initial: TValue,
  select: (value: TValue) => TSelection,
): Accessor<TSelection> => {
  const [snapshot, setSnapshot] = createSignal(initial);

  // Solid claims server markup as it is while hydrating, so the value reads `initial` until mounted.
  onMount(() => {
    createEffect(() => {
      const current = observable();

      setSnapshot(() => current.get());
      onCleanup(current.subscribe(() => setSnapshot(() => current.get())));
    });
  });

  return createMemo(() => select(snapshot()), undefined, {
    equals: Object.is,
  });
};
