import type { AnchorDiagnosticEvent } from "src/types/AnchorDiagnosticEvent";
import type { AnchorDiagnostics } from "src/types/AnchorDiagnostics";
import type { AnchorSnapshot } from "src/types/AnchorSnapshot";
import type { DiagnosticRecord } from "src/types/internal/DiagnosticRecord";
import { isolate } from "src/utils/common/isolate";
import { DIAGNOSTIC_TYPES } from "src/utils/constants/diagnostics";

type State =
  | {
      state: "ACTIVE";
      getSnapshot: () => AnchorSnapshot;
      snapshot: AnchorSnapshot | null;
    }
  | { state: "DISPOSED"; snapshot: AnchorSnapshot };

export class Diagnostics {
  #state: State;
  #now: () => number;
  #listeners = new Set<() => void>();
  #eventListeners = new Set<(event: AnchorDiagnosticEvent) => void>();
  #pending: AnchorDiagnosticEvent[] = [];
  #delivering = false;
  #scheduled = false;

  constructor({
    getSnapshot,
    now,
  }: {
    getSnapshot: () => AnchorSnapshot;
    now: () => number;
  }) {
    this.#state = { state: "ACTIVE", getSnapshot, snapshot: null };
    this.#now = now;
  }

  api: AnchorDiagnostics = {
    get: () => {
      const state = this.#state;

      if (state.state === "DISPOSED") {
        return state.snapshot;
      }

      if (state.snapshot === null) {
        state.snapshot = state.getSnapshot();
      }

      return state.snapshot;
    },
    subscribe: (listener) => {
      if (this.#state.state === "DISPOSED") {
        return () => {};
      }

      const subscription = () => listener();

      this.#listeners.add(subscription);

      return () => {
        this.#listeners.delete(subscription);
      };
    },
    events: {
      subscribe: (listener) => {
        if (this.#state.state === "DISPOSED") {
          return () => {};
        }

        const subscription = (event: AnchorDiagnosticEvent) => listener(event);

        this.#eventListeners.add(subscription);

        return () => {
          this.#eventListeners.delete(subscription);
        };
      },
    },
  };

  record = (record: DiagnosticRecord) => {
    if (this.#eventListeners.size === 0 || this.#state.state === "DISPOSED") {
      return;
    }

    this.#pending.push(this.#createEvent(record));
    this.#deliverPendingEvents();
  };

  changed = () => {
    if (this.#state.state === "DISPOSED") {
      return;
    }

    this.#state.snapshot = null;

    if (this.#listeners.size === 0 || this.#scheduled) {
      return;
    }

    this.#scheduled = true;
    queueMicrotask(() => {
      this.#scheduled = false;
      this.#notifySnapshotListeners();
    });
  };

  dispose = () => {
    if (this.#state.state === "DISPOSED") {
      return;
    }

    this.#state = { state: "DISPOSED", snapshot: this.#state.getSnapshot() };

    if (this.#eventListeners.size > 0) {
      this.#pending.push(
        this.#createEvent({
          type: DIAGNOSTIC_TYPES.ANCHOR_DISPOSED,
          session: null,
        }),
      );
    }

    this.#deliverPendingEvents();
    this.#notifySnapshotListeners();
    this.#listeners.clear();
  };

  #createEvent(record: DiagnosticRecord): AnchorDiagnosticEvent {
    return Object.freeze({
      type: record.type,
      session:
        record.session === null ? null : Object.freeze({ key: record.session }),
      timestamp: this.#now(),
      context:
        record.context === undefined ? null : Object.freeze(record.context),
    });
  }

  #deliverPendingEvents() {
    if (this.#delivering) {
      return;
    }

    this.#delivering = true;

    for (const event of this.#pending) {
      for (const listener of [...this.#eventListeners]) {
        if (!this.#eventListeners.has(listener)) {
          continue;
        }

        isolate(() => listener(event));
      }
    }

    this.#pending = [];
    this.#delivering = false;

    if (this.#state.state !== "DISPOSED") {
      return;
    }

    this.#eventListeners.clear();
  }

  #notifySnapshotListeners() {
    for (const listener of [...this.#listeners]) {
      if (!this.#listeners.has(listener)) {
        continue;
      }

      isolate(listener);
    }
  }
}
