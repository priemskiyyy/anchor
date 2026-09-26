import { expect, test } from "vitest";

import { formatOperationLine } from "src/formatting/formatOperationLine";

const session = { key: "5f0c1c9e-6b1e-4a53-9d0e-2f6a1d0c7b11" };

test("a read says whether it runs or waits its turn, and counts the callers waiting for it", () => {
  expect(formatOperationLine({ kind: "read", queued: false, waiters: 0 })).toBe(
    "read · active · 0 waiters",
  );
  expect(formatOperationLine({ kind: "read", queued: true, waiters: 1 })).toBe(
    "read · queued · 1 waiter",
  );
});

test("a token request names its profile, a forced refresh, its waiters and its session", () => {
  expect(
    formatOperationLine({
      kind: "token",
      session,
      profile: "api",
      forceRefresh: false,
      waiters: 2,
    }),
  ).toBe("token · api · 2 waiters · key 5f0c1c9e");
  expect(
    formatOperationLine({
      kind: "token",
      session,
      profile: "api",
      forceRefresh: true,
      waiters: 1,
    }),
  ).toBe("token · api · forced refresh · 1 waiter · key 5f0c1c9e");
});

test("an ending names its session", () => {
  expect(formatOperationLine({ kind: "end", session })).toBe(
    "end · key 5f0c1c9e",
  );
});

test("an operation of a kind outside the union fails loudly", () => {
  // @ts-expect-error A value from JavaScript can be outside the union.
  expect(() => formatOperationLine({ kind: "refresh" })).toThrow(
    new Error('Unexpected value: {"kind":"refresh"}'),
  );
});
