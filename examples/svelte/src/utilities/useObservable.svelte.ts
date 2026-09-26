import type { ObservableValue } from "@priemskiyyy/anchor";

export const useObservable = <TValue>(
  observable: () => ObservableValue<TValue>,
) => {
  const current = observable();

  let snapshot = $state.raw(current.get());

  // Subscribed at once, not inside $effect, so no update before the first effect flush is missed.
  const unsubscribe = current.subscribe(() => {
    snapshot = current.get();
  });

  $effect(() => unsubscribe);

  return {
    get current() {
      return snapshot;
    },
  };
};
