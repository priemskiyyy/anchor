import { createSignal, onCleanup } from "solid-js";
import type { Accessor } from "solid-js";

export const useStoredValue = <TValue>(
  key: string,
  parse: (raw: unknown) => TValue,
  fallback: TValue,
): [Accessor<TValue>, (next: TValue) => void] => {
  const getStoredValue = (): TValue => {
    try {
      const raw = localStorage.getItem(key);

      if (raw === null) {
        return fallback;
      }

      return parse(JSON.parse(raw));
    } catch {
      return fallback;
    }
  };

  const [value, setValue] = createSignal(getStoredValue());

  const handleStorage = (event: StorageEvent) => {
    if (event.key !== key) {
      return;
    }

    setValue(() => getStoredValue());
  };

  window.addEventListener("storage", handleStorage);
  onCleanup(() => window.removeEventListener("storage", handleStorage));

  const storeValue = (next: TValue) => {
    setValue(() => next);

    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      return;
    }
  };

  return [value, storeValue];
};
