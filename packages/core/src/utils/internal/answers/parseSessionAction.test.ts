import { expect, test } from "vitest";

import { parseSessionAction } from "src/utils/internal/answers/parseSessionAction";

test("an action is a frozen copy of the provider's name for the step", () => {
  const action = parseSessionAction({ kind: "setup-mfa", factors: ["totp"] });

  expect(action).toEqual({ kind: "setup-mfa" });
  expect(Object.isFrozen(action)).toBe(true);
});

test.each([
  [
    "nothing",
    undefined,
    "The adapter answered a required action without the action.",
  ],
  [
    "an empty kind",
    { kind: "" },
    "The adapter answered a required action without its kind.",
  ],
  [
    "a kind that is not a string",
    { kind: 1 },
    "The adapter answered a required action without its kind.",
  ],
])("an action with %s is refused as INVALID_ANSWER", (_, value, message) => {
  expect(() => parseSessionAction(value)).toThrow(
    expect.objectContaining({ code: "INVALID_ANSWER", message }),
  );
});
