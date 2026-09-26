import { expect, test } from "vitest";

import { formatContextSummary } from "src/formatting/formatContextSummary";

test("a context is summarised as its named fields, in the order Anchor recorded them", () => {
  expect(formatContextSummary({ status: "signed-in" })).toBe(
    "status signed-in",
  );
  expect(formatContextSummary({ profile: "api", forceRefresh: false })).toBe(
    "profile api · forceRefresh false",
  );
  expect(
    formatContextSummary({
      profile: "api",
      forceRefresh: true,
      code: "TOKEN_DISCARDED",
    }),
  ).toBe("profile api · forceRefresh true · code TOKEN_DISCARDED");
  expect(
    formatContextSummary({ local: "completed", remote: "not-applicable" }),
  ).toBe("local completed · remote not-applicable");
  expect(formatContextSummary({ callback: "invalidate" })).toBe(
    "callback invalidate",
  );
  expect(formatContextSummary({ attempts: 2, note: null })).toBe(
    "attempts 2 · note null",
  );
});

test("no context is an empty summary, and a context that is not an object is shown as it is", () => {
  expect(formatContextSummary(null)).toBe("");
  expect(formatContextSummary(undefined)).toBe("");
  expect(formatContextSummary("read")).toBe("read");
  expect(formatContextSummary(42)).toBe("42");
});

test("a nested object, a list or a function is left to the expanded context", () => {
  expect(
    formatContextSummary({
      code: "READ_FAILED",
      detail: { attempt: 2 },
      list: [1],
      callback: () => {},
    }),
  ).toBe("code READ_FAILED");
});
