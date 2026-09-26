import { expect, test, vi } from "vitest";

import type { DiagnosticRecord } from "src/types/internal/DiagnosticRecord";
import type { AnchorDiagnosticEvent } from "src/types/AnchorDiagnosticEvent";
import type { AnchorSnapshot } from "src/types/AnchorSnapshot";
import { Diagnostics } from "src/utils/internal/diagnostics/Diagnostics";

const snapshotOf = (generation: number): AnchorSnapshot => ({
  state: "started",
  adapter: { name: "mock" },
  session: { status: "signed-out", key: null, principal: null, generation },
  operations: [],
});

const create = () => {
  const runtime = { generation: 0 };
  const getSnapshot = vi.fn(() => snapshotOf(runtime.generation));
  const now = vi.fn(() => 42);
  const diagnostics = new Diagnostics({ getSnapshot, now });

  return { diagnostics, runtime, getSnapshot, now };
};

const accepted: DiagnosticRecord = {
  type: "session accepted",
  session: "key-1",
};

const isDeepFrozen = (value: unknown): boolean => {
  if (typeof value !== "object" || value === null) {
    return true;
  }

  return Object.isFrozen(value) && Object.values(value).every(isDeepFrozen);
};

test("the snapshot is read lazily and kept until something changes", () => {
  const { diagnostics, runtime, getSnapshot } = create();

  expect(getSnapshot).not.toHaveBeenCalled();

  const first = diagnostics.api.get();

  runtime.generation = 3;

  expect(diagnostics.api.get()).toBe(first);
  expect(first).toEqual(snapshotOf(0));
  expect(getSnapshot.mock.calls).toEqual([[]]);

  diagnostics.changed();

  expect(diagnostics.api.get()).toEqual(snapshotOf(3));
  expect(getSnapshot.mock.calls).toEqual([[], []]);
});

test("several changes in one turn notify observers once", async () => {
  const { diagnostics } = create();
  const listener = vi.fn();

  diagnostics.api.subscribe(listener);

  diagnostics.changed();
  diagnostics.changed();
  diagnostics.changed();

  expect(listener).not.toHaveBeenCalled();

  await Promise.resolve();

  expect(listener.mock.calls).toEqual([[]]);
});

test("with no listener, recording an event costs a check: the clock is not read and the context is left as it was", () => {
  const { diagnostics, now } = create();
  const listener = vi.fn<(event: AnchorDiagnosticEvent) => void>();
  const context = { status: "signed-in" };

  diagnostics.record({ ...accepted, context });

  expect(now).not.toHaveBeenCalled();
  expect(Object.isFrozen(context)).toBe(false);

  const stop = diagnostics.api.events.subscribe(listener);

  diagnostics.record({ ...accepted, context: { status: "signed-in" } });
  stop();
  diagnostics.record({ ...accepted, context });

  expect(listener.mock.calls).toEqual([
    [
      {
        type: "session accepted",
        session: { key: "key-1" },
        timestamp: 42,
        context: { status: "signed-in" },
      },
    ],
  ]);
  expect(now.mock.calls).toEqual([[]]);
  expect(Object.isFrozen(context)).toBe(false);
});

test("a published event names its session, and is one frozen event every listener shares", () => {
  const { diagnostics } = create();
  const first = vi.fn<(event: AnchorDiagnosticEvent) => void>();
  const second = vi.fn<(event: AnchorDiagnosticEvent) => void>();

  diagnostics.api.events.subscribe(first);
  diagnostics.api.events.subscribe(second);

  diagnostics.record({
    type: "token received",
    session: "key-1",
    context: { profile: "api", forceRefresh: false },
  });

  const published = first.mock.calls[0]?.[0];

  expect(published).toEqual({
    type: "token received",
    session: { key: "key-1" },
    timestamp: 42,
    context: { profile: "api", forceRefresh: false },
  });
  expect(second.mock.calls).toEqual([[published]]);
  expect(second.mock.calls[0]?.[0]).toBe(published);
  expect(isDeepFrozen(published)).toBe(true);
});

test("a listener that throws does not stop the others, for events or snapshots", () => {
  vi.spyOn(globalThis, "queueMicrotask").mockImplementation(() => {});

  const { diagnostics } = create();
  const events = vi.fn<(event: AnchorDiagnosticEvent) => void>();
  const snapshots = vi.fn();

  diagnostics.api.events.subscribe(() => {
    throw new Error("listener failed");
  });
  diagnostics.api.events.subscribe(events);
  diagnostics.api.subscribe(() => {
    throw new Error("listener failed");
  });
  diagnostics.api.subscribe(snapshots);

  diagnostics.record(accepted);
  diagnostics.dispose();

  expect(events.mock.calls.map(([event]) => event.type)).toEqual([
    "session accepted",
    "anchor disposed",
  ]);
  expect(snapshots.mock.calls).toEqual([[]]);
});

test("a listener removed by an earlier one while an event is delivered is not called", () => {
  const { diagnostics } = create();
  const removed = vi.fn();

  let stopRemoved = () => {};

  diagnostics.api.events.subscribe(() => stopRemoved());
  stopRemoved = diagnostics.api.events.subscribe(removed);

  diagnostics.record(accepted);

  expect(removed).not.toHaveBeenCalled();
});

test("disposal sends one last anchor disposed event and notification, then goes quiet with the snapshot it ended with", () => {
  const { diagnostics, runtime, getSnapshot } = create();
  const listener = vi.fn();
  const events = vi.fn<(event: AnchorDiagnosticEvent) => void>();

  diagnostics.api.subscribe(listener);
  diagnostics.api.events.subscribe(events);
  runtime.generation = 2;

  diagnostics.dispose();
  diagnostics.dispose();
  runtime.generation = 5;
  diagnostics.changed();
  diagnostics.record(accepted);

  expect(listener.mock.calls).toEqual([[]]);
  expect(events.mock.calls).toEqual([
    [
      {
        type: "anchor disposed",
        session: null,
        timestamp: 42,
        context: null,
      },
    ],
  ]);
  expect(diagnostics.api.get()).toEqual(snapshotOf(2));
  expect(diagnostics.api.get()).toBe(diagnostics.api.get());
  expect(getSnapshot.mock.calls).toEqual([[]]);
});

test("subscribing after disposal is a no-op rather than a leak", async () => {
  const { diagnostics } = create();
  const listener = vi.fn();

  diagnostics.dispose();

  const stopSnapshot = diagnostics.api.subscribe(listener);
  const stopEvents = diagnostics.api.events.subscribe(listener);

  diagnostics.changed();
  diagnostics.record(accepted);
  await Promise.resolve();
  stopSnapshot();
  stopEvents();

  expect(listener).not.toHaveBeenCalled();
});

test("a record made from inside a listener reaches every listener after the event being delivered", () => {
  const { diagnostics } = create();
  const seen: string[] = [];

  diagnostics.api.events.subscribe((event) => {
    seen.push(`first: ${event.type}`);

    if (event.type !== "session accepted") {
      return;
    }

    diagnostics.record({ type: "token requested", session: "key-1" });
  });
  diagnostics.api.events.subscribe((event) => {
    seen.push(`second: ${event.type}`);
  });

  diagnostics.record(accepted);

  expect(seen).toEqual([
    "first: session accepted",
    "second: session accepted",
    "first: token requested",
    "second: token requested",
  ]);
});

test("disposing from inside a listener still ends every listener's stream with anchor disposed", () => {
  const { diagnostics } = create();
  const seen: string[] = [];

  diagnostics.api.events.subscribe((event) => {
    seen.push(`first: ${event.type}`);

    if (event.type !== "session accepted") {
      return;
    }

    diagnostics.dispose();
  });
  diagnostics.api.events.subscribe((event) => {
    seen.push(`second: ${event.type}`);

    if (event.type !== "anchor disposed") {
      return;
    }

    diagnostics.record(accepted);
  });

  diagnostics.record(accepted);
  diagnostics.record(accepted);

  expect(seen).toEqual([
    "first: session accepted",
    "second: session accepted",
    "first: anchor disposed",
    "second: anchor disposed",
  ]);
});
