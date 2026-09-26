import { afterEach, expect, test, vi } from "vitest";

import type { Token } from "src/types/Token";
import { AnchorError } from "src/utils/AnchorError";
import { createDeferred } from "src/utils/common/createDeferred";
import { TokenRequest } from "src/utils/internal/sessions/TokenRequest";

const token: Token = Object.freeze({
  value: "eyJ.access",
  kind: "access-token",
  scheme: "Bearer",
});

const create = (timeout = 1_000) => {
  const answer = createDeferred<Token>();
  const signals: AbortSignal[] = [];
  const onSettled = vi.fn();
  const onWaiterReleased = vi.fn();

  const request = new TokenRequest({
    mint: (signal) => {
      signals.push(signal);

      return answer.promise;
    },
    timeout,
    onSettled,
    onWaiterReleased,
  });

  return { request, answer, signals, onSettled, onWaiterReleased };
};

afterEach(() => {
  vi.useRealTimers();
});

test("every waiter gets the one token the adapter answered, and the request settles once", async () => {
  const { request, answer, signals, onSettled } = create();
  const first = request.join(undefined);
  const second = request.join(undefined);

  request.start();
  answer.resolve(token);

  await expect(first).resolves.toBe(token);
  await expect(second).resolves.toBe(token);
  expect(signals).toHaveLength(1);
  expect(signals[0]?.aborted).toBe(false);
  expect(onSettled.mock.calls).toEqual([[]]);
  expect(request.countWaiters()).toBe(0);
});

test("a caller that aborts leaves with ABORTED and is reported, and the others keep waiting", async () => {
  const { request, answer, signals, onWaiterReleased } = create();
  const leaving = new AbortController();
  const staying = request.join(undefined);
  const left = request.join(leaving.signal);

  request.start();
  leaving.abort();

  await expect(left).rejects.toMatchObject({ code: "ABORTED" });
  expect(request.countWaiters()).toBe(1);
  expect(onWaiterReleased).toHaveBeenCalledTimes(1);
  expect(signals[0]?.aborted).toBe(false);

  answer.resolve(token);

  await expect(staying).resolves.toBe(token);
});

test("when the last waiter leaves, the adapter's signal aborts and a late token reaches nobody", async () => {
  const { request, answer, signals, onSettled } = create();
  const controller = new AbortController();
  const waiting = request.join(controller.signal);

  request.start();
  controller.abort();

  await expect(waiting).rejects.toMatchObject({ code: "ABORTED" });
  expect(signals[0]?.aborted).toBe(true);
  expect(onSettled.mock.calls).toEqual([[]]);

  answer.resolve(token);
  await Promise.resolve();

  expect(onSettled.mock.calls).toEqual([[]]);
});

test("a failure rejects every waiter with the same error and aborts the adapter's signal", async () => {
  const { request, signals } = create();
  const first = request.join(undefined);
  const second = request.join(undefined);

  const failure = new AnchorError({
    code: "SESSION_CHANGED",
    message: "Replaced.",
  });

  request.start();
  request.fail(failure);
  request.fail(new Error("a second failure"));

  await expect(first).rejects.toBe(failure);
  await expect(second).rejects.toBe(failure);
  expect(signals[0]?.aborted).toBe(true);
});

test("an adapter rejection reaches every waiter as the adapter's error", async () => {
  const { request, answer } = create();
  const waiting = request.join(undefined);
  const failure = new Error("network down");

  request.start();
  answer.reject(failure);

  await expect(waiting).rejects.toBe(failure);
});

test("the timeout rejects every waiter with TIMEOUT and aborts the adapter's signal", async () => {
  vi.useFakeTimers();

  const { request, signals, onSettled } = create(250);
  const waiting = request.join(undefined);

  request.start();
  vi.advanceTimersByTime(249);

  expect(request.countWaiters()).toBe(1);

  vi.advanceTimersByTime(1);

  await expect(waiting).rejects.toMatchObject({
    code: "TIMEOUT",
    message: "The token request took longer than 250 milliseconds.",
  });
  expect(signals[0]?.aborted).toBe(true);
  expect(onSettled.mock.calls).toEqual([[]]);
});

test("a settled request leaves no abort listener on a caller's signal", async () => {
  const { request, answer } = create();
  const controller = new AbortController();

  const removeEventListener = vi.spyOn(
    controller.signal,
    "removeEventListener",
  );

  const waiting = request.join(controller.signal);

  request.start();
  answer.resolve(token);
  await waiting;

  expect(removeEventListener.mock.calls).toEqual([
    ["abort", expect.any(Function)],
  ]);
});

test("a settled request leaves no timer behind", async () => {
  vi.useFakeTimers();

  const { request, answer } = create();
  const waiting = request.join(undefined);

  request.start();

  expect(vi.getTimerCount()).toBe(1);

  answer.resolve(token);
  await waiting;

  expect(vi.getTimerCount()).toBe(0);
});

test("a request that settled before it started never asks the adapter and starts no timer", () => {
  vi.useFakeTimers();

  const { request, signals } = create();
  const waiting = request.join(undefined);

  request.fail(new AnchorError({ code: "DISPOSED", message: "Disposed." }));
  request.start();

  expect(signals).toEqual([]);
  expect(vi.getTimerCount()).toBe(0);

  return expect(waiting).rejects.toMatchObject({ code: "DISPOSED" });
});
