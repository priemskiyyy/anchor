import type { AnchorDiagnosticEvent } from "@priemskiyyy/anchor";

import { formatContextSummary } from "src/formatting/formatContextSummary";
import { formatContextText } from "src/formatting/formatContextText";
import type { RecordedEvent } from "src/types/internal/RecordedEvent";
import { DEFAULT_MAX_EVENTS } from "src/utils/constants/defaults";
import { getEventGroup } from "src/utils/getEventGroup";

// Clamped, never thrown on: a bad prop must not crash the host application.
const clampLimit = (limit: number) => {
  if (Number.isNaN(limit)) {
    return DEFAULT_MAX_EVENTS;
  }

  return Math.min(1_000, Math.max(1, Math.trunc(limit)));
};

export class EventLog {
  #events: RecordedEvent[] = [];
  #listeners = new Set<() => void>();
  #limit = DEFAULT_MAX_EVENTS;
  #lastId = 0;
  #scheduled = false;

  get = () => this.#events;

  setLimit = (limit: number) => {
    this.#limit = clampLimit(limit);

    if (this.#events.length <= this.#limit) {
      return;
    }

    this.#events = this.#events.slice(0, this.#limit);
    this.#notifyListeners();
  };

  subscribe = (listener: () => void) => {
    // Wrapped, so the same function subscribed twice is two subscriptions.
    const notify = () => listener();

    this.#listeners.add(notify);

    return () => {
      this.#listeners.delete(notify);
    };
  };

  add = (event: AnchorDiagnosticEvent) => {
    this.#lastId += 1;

    const recorded: RecordedEvent = {
      id: this.#lastId,
      type: event.type,
      session: event.session,
      timestamp: event.timestamp,
      group: getEventGroup(event),
      summary: formatContextSummary(event.context),
      context: formatContextText(event.context),
    };

    this.#events = [recorded, ...this.#events].slice(0, this.#limit);
    this.#notifyListeners();
  };

  clear = () => {
    this.#events = [];
    this.#notifyListeners();
  };

  #notifyListeners() {
    if (this.#scheduled) {
      return;
    }

    this.#scheduled = true;
    queueMicrotask(() => {
      this.#scheduled = false;

      for (const listener of [...this.#listeners]) {
        if (!this.#listeners.has(listener)) {
          continue;
        }

        listener();
      }
    });
  }
}
