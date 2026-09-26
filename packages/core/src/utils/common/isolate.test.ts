import { expect, test, vi } from "vitest";

import { isolate } from "src/utils/common/isolate";

const collectMicrotasks = () => {
  const tasks: Array<() => void> = [];

  vi.spyOn(globalThis, "queueMicrotask").mockImplementation((task) => {
    tasks.push(task);
  });

  return tasks;
};

test("a throwing callback cannot break its caller and is rethrown outside the chain", () => {
  const tasks = collectMicrotasks();
  const failure = new Error("listener failed");

  expect(() =>
    isolate(() => {
      throw failure;
    }),
  ).not.toThrow();

  expect(tasks).toHaveLength(1);
  expect(tasks[0]).toThrow(failure);
});

test("a callback whose promise rejects is reported the same way", async () => {
  const tasks = collectMicrotasks();
  const failure = new Error("async listener failed");

  isolate(() => Promise.reject(failure));
  await new Promise((resolve) => setTimeout(resolve, 0));

  expect(tasks).toHaveLength(1);
  expect(tasks[0]).toThrow(failure);
});

test("a callback that returns nothing, or a value that is no promise, schedules nothing", () => {
  const tasks = collectMicrotasks();

  isolate(() => {});
  isolate(() => 1);

  expect(tasks).toEqual([]);
});

test("a throw is rethrown on a microtask at once, and a rejection only once it lands", async () => {
  const tasks = collectMicrotasks();
  const failure = new Error("listener failed");

  isolate(() => {
    throw failure;
  });

  expect(tasks).toHaveLength(1);

  isolate(() => Promise.reject(failure));

  expect(tasks).toHaveLength(1);

  await new Promise((resolve) => setTimeout(resolve, 0));

  expect(tasks).toHaveLength(2);
  expect(tasks[0]).toThrow(failure);
  expect(tasks[1]).toThrow(failure);
});

test.each(["constructor", "then"])(
  "a promise whose %s cannot be read fails like a rejection, reported once after the call returns",
  async (key) => {
    const tasks = collectMicrotasks();
    const thrown = new Error(`${key} exploded`);
    const answer = Promise.resolve("done");

    Object.defineProperty(answer, key, {
      get() {
        throw thrown;
      },
    });

    isolate(() => answer);

    expect(tasks).toEqual([]);

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toThrow(thrown);
  },
);
