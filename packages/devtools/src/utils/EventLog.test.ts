import type {
  AnchorDiagnosticEvent,
  AnchorDiagnosticType,
} from "@priemskiyyy/anchor";
import { expect, test } from "vitest";

import { EventLog } from "src/utils/EventLog";

const KEY = "5f0c1c9e-6b1e-4a53-9d0e-2f6a1d0c7b11";

const createEvent = (
  type: AnchorDiagnosticType,
  context: unknown = null,
): AnchorDiagnosticEvent => ({
  type,
  session: { key: KEY },
  timestamp: 1_000,
  context,
});

test("keeps the newest events first within the limit and notifies once per microtask", async () => {
  const log = new EventLog();
  let notifications = 0;

  log.setLimit(2);

  log.subscribe(() => {
    notifications += 1;
  });

  log.add(createEvent("read started"));
  log.add(createEvent("read completed", { status: "signed-in" }));
  log.add(createEvent("session accepted", { status: "signed-in" }));
  expect(log.get().map((entry) => entry.type)).toEqual([
    "session accepted",
    "read completed",
  ]);
  expect(log.get().map((entry) => entry.id)).toEqual([3, 2]);
  expect(notifications).toBe(0);

  await Promise.resolve();
  expect(notifications).toBe(1);

  log.setLimit(5);
  await Promise.resolve();
  expect(notifications).toBe(1);

  log.setLimit(1);
  expect(log.get().map((entry) => entry.type)).toEqual(["session accepted"]);
  await Promise.resolve();
  expect(notifications).toBe(2);

  log.clear();
  expect(log.get()).toEqual([]);
  await Promise.resolve();
  expect(notifications).toBe(3);

  log.add(createEvent("read started"));
  expect(log.get().map((entry) => entry.id)).toEqual([4]);
});

test("the limit is 200 until set, is clamped to 1 and 1000 and cut to a whole number, and falls back to 200 when it is not a number", () => {
  const countKeptEvents = (limit: number | null, count: number) => {
    const log = new EventLog();

    if (limit !== null) {
      log.setLimit(limit);
    }

    for (let index = 0; index < count; index += 1) {
      log.add(createEvent("read started"));
    }

    return log.get().length;
  };

  expect(countKeptEvents(null, 250)).toBe(200);
  expect(countKeptEvents(0, 3)).toBe(1);
  expect(countKeptEvents(2.9, 3)).toBe(2);
  expect(countKeptEvents(5_000, 1_001)).toBe(1_000);
  expect(countKeptEvents(Number.NaN, 250)).toBe(200);
});

test("records an event with its group, a summary of its context and the context as JSON", () => {
  const log = new EventLog();
  const context = { profile: "api", forceRefresh: true, code: "TOKEN_FAILED" };

  log.add(createEvent("token failed", context));
  log.add({ ...createEvent("anchor started"), session: null });

  expect(log.get()).toEqual([
    {
      id: 2,
      type: "anchor started",
      session: null,
      timestamp: 1_000,
      group: "LIFECYCLE",
      summary: "",
      context: "null",
    },
    {
      id: 1,
      type: "token failed",
      session: { key: KEY },
      timestamp: 1_000,
      group: "TOKENS",
      summary: "profile api · forceRefresh true · code TOKEN_FAILED",
      context: JSON.stringify(context, null, 2),
    },
  ]);
});

test("an observer removed by an earlier one during a notification is not called", async () => {
  const log = new EventLog();
  const calls: string[] = [];

  let stopSecond = () => {};

  log.subscribe(() => {
    calls.push("first");
    stopSecond();
  });
  stopSecond = log.subscribe(() => {
    calls.push("second");
  });

  log.add(createEvent("read started"));
  await Promise.resolve();

  expect(calls).toEqual(["first"]);
});

test("the same function subscribed twice is two subscriptions", async () => {
  const log = new EventLog();
  const calls: string[] = [];

  const listener = () => {
    calls.push("called");
  };

  const stop = log.subscribe(listener);

  log.subscribe(listener);
  log.add(createEvent("read started"));
  await Promise.resolve();
  expect(calls).toEqual(["called", "called"]);

  stop();
  log.add(createEvent("read started"));
  await Promise.resolve();
  expect(calls).toEqual(["called", "called", "called"]);
});
