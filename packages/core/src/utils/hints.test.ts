import { expect, test, vi } from "vitest";

import { createMockAdapter } from "src/mock/createMockAdapter";
import type { AnchorDiagnosticEvent } from "src/types/AnchorDiagnosticEvent";
import type { SyncHint } from "src/types/SyncHint";
import type { SyncHintTarget } from "src/types/SyncHintTarget";
import { Anchor } from "src/utils/Anchor";
import { signedIn, signedOut } from "src/utils/answers.fixture";
import type { User } from "src/utils/answers.fixture";

const createRecordingHint = () => {
  const targets: SyncHintTarget[] = [];
  const remove = vi.fn();

  const hint: SyncHint = (target) => {
    targets.push(target);

    return remove;
  };

  return { hint, targets, remove };
};

test("a hint is installed by start, never by construction, and removed by dispose, once each", async () => {
  const recording = createRecordingHint();
  const mock = createMockAdapter<User>({ answer: signedOut });

  const anchor = new Anchor({
    adapter: mock.adapter,
    hints: [recording.hint],
  });

  expect(recording.targets).toEqual([]);

  await anchor.start();
  await anchor.start();

  expect(recording.targets).toHaveLength(1);
  expect(recording.remove).not.toHaveBeenCalled();

  anchor.dispose();
  anchor.dispose();

  expect(recording.remove).toHaveBeenCalledTimes(1);
});

test("a hint's sync asks for one read, which coalesces with the reads already running", async () => {
  const recording = createRecordingHint();

  const mock = createMockAdapter<User>({
    answer: signedOut,
    hold: { read: true },
  });

  const anchor = new Anchor({
    adapter: mock.adapter,
    hints: [recording.hint],
  });

  const started = anchor.start();
  const [target] = recording.targets;

  target?.sync();
  target?.sync();
  target?.sync();

  expect(mock.reads).toHaveLength(1);

  mock.reads[0]?.settle();
  await started;
  await Promise.resolve();

  expect(mock.reads).toHaveLength(2);

  mock.reads[1]?.settle();
  await Promise.resolve();

  expect(mock.reads).toHaveLength(2);
});

test("a hint that asks for a read while it installs reads nothing extra, because the adapter has not opened yet", async () => {
  const mock = createMockAdapter<User>({ answer: signedOut });

  const anchor = new Anchor({
    adapter: mock.adapter,
    hints: [
      ({ sync }) => {
        sync();

        return () => {};
      },
    ],
  });

  await anchor.start();

  expect(mock.reads).toHaveLength(1);
});

test("a hint sees the session's status and key after each commit, and nothing else", async () => {
  const recording = createRecordingHint();
  const mock = createMockAdapter<User>({ answer: signedIn("ada") });

  const anchor = new Anchor({
    adapter: mock.adapter,
    hints: [recording.hint],
  });

  const started = anchor.start();
  const [target] = recording.targets;
  const seen: unknown[] = [];

  target?.session.subscribe(() => seen.push(target.session.get()));

  expect(target?.session.get()).toEqual({ status: "initializing", key: null });

  await started;

  const state = anchor.session.get();
  const key = state.status === "signed-in" ? state.session.key : "";

  mock.push(signedOut);

  expect(seen).toEqual([
    { status: "signed-in", key },
    { status: "signed-out", key: null },
  ]);
  expect(Object.isFrozen(seen[0])).toBe(true);
});

test("a hint that throws while installing fails the start before the adapter opens, removes the hints already installed, and the start may be tried again", async () => {
  const failure = new Error("AppState is not available.");
  const installed = createRecordingHint();
  const mock = createMockAdapter<User>({ answer: signedOut });
  let attempts = 0;

  const anchor = new Anchor({
    adapter: mock.adapter,
    hints: [
      installed.hint,
      () => {
        attempts += 1;

        if (attempts === 1) {
          throw failure;
        }

        return () => {};
      },
    ],
  });

  await expect(anchor.start()).rejects.toMatchObject({
    code: "START_FAILED",
    message: "A sync hint could not install.",
    cause: failure,
  });
  expect(mock.sessions).toEqual([]);
  expect(installed.remove).toHaveBeenCalledTimes(1);
  expect(anchor.diagnostics.get().state).toBe("idle");

  await anchor.start();

  expect(anchor.session.get()).toEqual({ status: "signed-out" });
  expect(installed.targets).toHaveLength(2);
});

test("an adapter that cannot open removes the hints already installed", async () => {
  const recording = createRecordingHint();
  const mock = createMockAdapter<User>({ answer: signedOut });

  const anchor = new Anchor({
    adapter: {
      ...mock.adapter,
      open: () => {
        throw new Error("The SDK is not configured.");
      },
    },
    hints: [recording.hint],
  });

  await expect(anchor.start()).rejects.toMatchObject({ code: "START_FAILED" });
  expect(recording.remove).toHaveBeenCalledTimes(1);
});

test("a hint's sync from a start that failed reads nothing and is recorded as an ignored callback", async () => {
  const recording = createRecordingHint();
  const events: AnchorDiagnosticEvent[] = [];
  let failing = true;

  const mock = createMockAdapter<User>({
    answer: signedOut,
    onOpen: () => {
      if (!failing) {
        return;
      }

      throw new Error("not yet");
    },
  });

  const anchor = new Anchor({
    adapter: mock.adapter,
    hints: [recording.hint],
  });

  anchor.diagnostics.events.subscribe((event) => events.push(event));
  await expect(anchor.start()).rejects.toMatchObject({ code: "START_FAILED" });
  failing = false;
  await anchor.start();
  recording.targets[0]?.sync();

  expect(mock.reads).toHaveLength(1);
  expect(events.at(-1)).toMatchObject({
    type: "callback ignored",
    context: { callback: "sync hint" },
  });
});

test("a hint whose removal throws stops neither dispose nor the other removals, and the failure is rethrown outside", async () => {
  const tasks: Array<() => void> = [];
  const failure = new Error("listener already removed");
  const recording = createRecordingHint();
  const mock = createMockAdapter<User>({ answer: signedOut });

  vi.spyOn(globalThis, "queueMicrotask").mockImplementation((task) => {
    tasks.push(task);
  });

  const anchor = new Anchor({
    adapter: mock.adapter,
    hints: [
      () => () => {
        throw failure;
      },
      recording.hint,
    ],
  });

  await anchor.start();
  anchor.dispose();

  expect(recording.remove).toHaveBeenCalledTimes(1);
  expect(mock.sessions[0]?.disposeCount).toBe(1);
  expect(
    tasks.some((task) => {
      try {
        task();
      } catch (error) {
        return error === failure;
      }

      return false;
    }),
  ).toBe(true);
});

test("a hint reads one view of the session until the state changes, and a new one after", async () => {
  const recording = createRecordingHint();
  const mock = createMockAdapter<User>({ answer: signedOut });
  const anchor = new Anchor({ adapter: mock.adapter, hints: [recording.hint] });

  await anchor.start();

  const [target] = recording.targets;

  if (target === undefined) {
    throw new Error("The hint was never installed.");
  }

  const before = target.session.get();

  expect(target.session.get()).toBe(before);

  mock.push(signedIn("ada"));

  const after = target.session.get();

  expect(after).not.toBe(before);
  expect(after).toMatchObject({ status: "signed-in" });
  expect(target.session.get()).toBe(after);
});
