import type { ObservableValue } from "@priemskiyyy/anchor";
import type { ReadableValue } from "../../types/ReadableValue.js";

export const useObservableValue = <TValue, TSelection>(
  observable: () => ObservableValue<TValue>,
  initial: TValue,
  select: (value: TValue) => TSelection,
): ReadableValue<TSelection> => {
  // Raw, so the state keeps its identity instead of being proxied.
  let snapshot = $state.raw(initial);
  let selected: { value: TSelection } | undefined;

  // $derived compares with ===, so the selection lives in a box replaced only when Object.is sees a change.
  const selection = $derived.by(() => {
    const next = select(snapshot);

    if (selected === undefined || !Object.is(next, selected.value)) {
      selected = { value: next };
    }

    return selected;
  });

  // Effects never run on the server and run after mount on the client, so both render `initial` first.
  $effect(() => {
    const current = observable();

    snapshot = current.get();

    return current.subscribe(() => {
      snapshot = current.get();
    });
  });

  return {
    get current() {
      return selection.value;
    },
  };
};
