import type { ObservableValue } from "@priemskiyyy/anchor";

export type EventLog<T> = ObservableValue<T[]> & { clear: () => void };
