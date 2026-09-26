import type { ObservableValue } from "@priemskiyyy/anchor";

export type ValueStore<T> = ObservableValue<T> & { set: (next: T) => void };
