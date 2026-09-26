import type { ObservableValue } from "@priemskiyyy/anchor";
import { createEffect, createSignal, onCleanup } from "solid-js";
import type { Accessor } from "solid-js";

export const useObservableValue = <TValue>(
  source: Accessor<ObservableValue<TValue>>,
): Accessor<TValue> => {
  const [value, setValue] = createSignal(source().get());

  createEffect(() => {
    const current = source();

    setValue(() => current.get());
    onCleanup(current.subscribe(() => setValue(() => current.get())));
  });

  return value;
};
