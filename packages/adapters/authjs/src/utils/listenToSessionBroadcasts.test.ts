// @vitest-environment jsdom
import { afterEach, expect, test, vi } from "vitest";

import { listenToSessionBroadcasts } from "src/utils/listenToSessionBroadcasts";

afterEach(() => {
  vi.unstubAllGlobals();
});

const dispatchStorage = (key: string | null) =>
  window.dispatchEvent(
    new StorageEvent("storage", {
      key,
      newValue: '{"event":"session","data":{"trigger":"signout"}}',
    }),
  );

test("a broadcast next-auth wrote in another tab calls the listener, and any other storage change does not", () => {
  const listener = vi.fn();

  listenToSessionBroadcasts(listener);
  dispatchStorage("nextauth.message");
  dispatchStorage("theme");
  dispatchStorage(null);

  expect(listener.mock.calls).toEqual([[]]);
});

test("the removal it returns stops the listener", () => {
  const listener = vi.fn();
  const remove = listenToSessionBroadcasts(listener);

  remove();
  dispatchStorage("nextauth.message");

  expect(listener.mock.calls).toEqual([]);
});

test("outside a browser it listens to nothing and removes nothing", () => {
  vi.stubGlobal("window", undefined);

  const remove = listenToSessionBroadcasts(() => {});

  expect(remove()).toBe(undefined);
});
