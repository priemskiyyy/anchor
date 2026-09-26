import { expect, test } from "vitest";

import { formatContextText } from "src/formatting/formatContextText";

test("the context is shown as indented JSON, and an absent one by name", () => {
  expect(formatContextText({ profile: "api", forceRefresh: false })).toBe(
    '{\n  "profile": "api",\n  "forceRefresh": false\n}',
  );
  expect(formatContextText(null)).toBe("null");
  expect(formatContextText(undefined)).toBe("undefined");
});

test("a context JSON cannot hold says so instead of breaking the row", () => {
  const circular: { self?: unknown } = {};

  circular.self = circular;

  expect(formatContextText(circular)).toBe("[Unable to show this value]");
  expect(formatContextText({ attempts: 7n })).toBe(
    "[Unable to show this value]",
  );
});
