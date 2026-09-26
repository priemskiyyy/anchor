import type { EventLog } from "example-shared/types/EventLog";
import { createValueStore } from "example-shared/utils/createValueStore";

/** A bounded, newest-first log that every framework reads as an observable value. */
export const createEventLog = <T>(length: number) => {
  const entries = createValueStore<T[]>([]);

  const log: EventLog<T> = {
    get: entries.get,
    subscribe: entries.subscribe,
    clear: () => {
      entries.set([]);
    },
  };

  return {
    log,
    add: (entry: T) => {
      entries.set([entry, ...entries.get()].slice(0, length));
    },
  };
};
