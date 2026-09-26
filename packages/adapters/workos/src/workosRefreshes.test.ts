import { expect, test, vi } from "vitest";

import { workosRefreshes } from "src/workosRefreshes";

test("a refresh keeps its organization and impersonator, frozen, never its token, and tells every listener", () => {
  const refreshes = workosRefreshes();
  const listener = vi.fn();

  refreshes.subscribe(listener);

  expect(refreshes.getLatestRefresh()).toBe(null);

  refreshes.handleRefresh({
    organizationId: "org_acme",
    impersonator: { email: "support@example.com" },
  });

  expect(refreshes.getLatestRefresh()).toEqual({
    organizationId: "org_acme",
    impersonator: "support@example.com",
  });
  expect(Object.isFrozen(refreshes.getLatestRefresh())).toBe(true);

  refreshes.handleRefresh({});

  expect(refreshes.getLatestRefresh()).toEqual({
    organizationId: null,
    impersonator: null,
  });
  expect(listener.mock.calls).toEqual([[], []]);
});

test("a refresh failure forgets the latest refresh and tells every listener", () => {
  const refreshes = workosRefreshes();
  const listener = vi.fn();

  refreshes.subscribe(listener);
  refreshes.handleRefresh({ organizationId: "org_acme" });
  refreshes.handleRefreshFailure();

  expect(refreshes.getLatestRefresh()).toBe(null);
  expect(listener.mock.calls).toEqual([[], []]);
});

test("a listener that unsubscribes hears nothing more, and the others keep hearing", () => {
  const refreshes = workosRefreshes();
  const kept = vi.fn();
  const removed = vi.fn();

  refreshes.subscribe(kept);

  const unsubscribe = refreshes.subscribe(removed);

  unsubscribe();
  refreshes.handleRefresh({});

  expect(kept.mock.calls).toEqual([[]]);
  expect(removed.mock.calls).toEqual([]);
});

test("the relay is frozen, so its callbacks cannot be swapped after they were handed to AuthKit", () => {
  expect(Object.isFrozen(workosRefreshes())).toBe(true);
});
