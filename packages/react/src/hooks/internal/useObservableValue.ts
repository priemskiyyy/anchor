import type { ObservableValue } from "@priemskiyyy/anchor";
import { useMemo, useSyncExternalStore } from "react";

import { SelectionMemo } from "src/hooks/internal/SelectionMemo";

export const useObservableValue = <TValue, TSelection>(
  value: ObservableValue<TValue>,
  getServerSnapshot: () => TValue,
  select: (value: TValue) => TSelection,
): TSelection => {
  const memo = useMemo(() => new SelectionMemo(select), [select]);

  return useSyncExternalStore(
    value.subscribe,
    () => memo.getSelection(value.get()),
    () => memo.getSelection(getServerSnapshot()),
  );
};
