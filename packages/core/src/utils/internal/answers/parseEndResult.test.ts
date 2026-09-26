import { expect, test } from "vitest";

import { parseEndResult } from "src/utils/internal/answers/parseEndResult";

test("an ending is a frozen copy of its steps and its navigation", () => {
  const result = parseEndResult({
    local: "completed",
    remote: "unknown",
    navigation: { url: "https://example.auth0.com/v2/logout" },
  });

  expect(result).toEqual({
    local: "completed",
    remote: "unknown",
    navigation: { url: "https://example.auth0.com/v2/logout" },
  });
  expect(Object.isFrozen(result)).toBe(true);
  expect(result.navigation !== null && Object.isFrozen(result.navigation)).toBe(
    true,
  );
  expect(
    parseEndResult({
      local: "completed",
      remote: "not-applicable",
      navigation: null,
    }),
  ).toEqual({ local: "completed", remote: "not-applicable", navigation: null });
});

test.each([
  ["nothing", undefined, "The adapter answered an ending without a result."],
  [
    "an unknown local step",
    { local: "done", remote: "unknown", navigation: null },
    "The adapter answered an ending step its contract does not allow.",
  ],
  [
    "no remote step",
    { local: "completed", navigation: null },
    "The adapter answered an ending step its contract does not allow.",
  ],
  [
    "a missing navigation",
    { local: "completed", remote: "unknown" },
    "The adapter answered a navigation that is neither a page nor null.",
  ],
  [
    "a navigation that is a string",
    {
      local: "completed",
      remote: "unknown",
      navigation: "https://example.com",
    },
    "The adapter answered a navigation that is neither a page nor null.",
  ],
  [
    "a navigation without its url",
    { local: "completed", remote: "unknown", navigation: { url: "" } },
    "The adapter answered a navigation without its url.",
  ],
])("an ending with %s is refused as INVALID_ANSWER", (_, value, message) => {
  const read = () => {
    // @ts-expect-error An adapter written in JavaScript can answer anything.
    parseEndResult(value);
  };

  expect(read).toThrow(
    expect.objectContaining({ code: "INVALID_ANSWER", message }),
  );
});
