import { expect, test } from "vitest";

import { assertUnreachable } from "src/utils/assertUnreachable";

type Position = "bottom" | "right";

type Action = { kind: "OPEN" } | { kind: "TOGGLE_PAUSE"; count: number };

const formatPosition = (position: Position) => {
  if (position === "bottom") {
    return "docked to the bottom";
  }

  if (position === "right") {
    return "docked to the right";
  }

  return assertUnreachable(position);
};

const formatAction = (action: Action) => {
  if (action.kind === "OPEN") {
    return "open";
  }

  if (action.kind === "TOGGLE_PAUSE") {
    return `toggle ${action.count} times`;
  }

  return assertUnreachable(action);
};

test("every declared variant is handled before the unreachable branch", () => {
  expect(formatPosition("bottom")).toBe("docked to the bottom");
  expect(formatPosition("right")).toBe("docked to the right");
  expect(formatAction({ kind: "OPEN" })).toBe("open");
  expect(formatAction({ kind: "TOGGLE_PAUSE", count: 3 })).toBe(
    "toggle 3 times",
  );
});

test("a value that slipped past the types fails loudly and is named", () => {
  // @ts-expect-error A value from JavaScript can be outside the union.
  expect(() => formatPosition("top")).toThrow(
    new Error('Unexpected value: "top"'),
  );
});

test("an object variant is printed, never as [object Object]", () => {
  // @ts-expect-error A value from JavaScript can be outside the union.
  expect(() => formatAction({ kind: "CLOSE" })).toThrow(
    new Error('Unexpected value: {"kind":"CLOSE"}'),
  );
});

test("a variant JSON cannot print still throws a readable error", () => {
  const circular: { kind: "RESIZE"; self?: unknown } = { kind: "RESIZE" };

  circular.self = circular;

  // @ts-expect-error A value from JavaScript can be outside the union.
  expect(() => formatAction(circular)).toThrow(
    new Error("Unexpected value: [object Object]"),
  );
  // @ts-expect-error A value from JavaScript can be outside the union.
  expect(() => formatPosition(undefined)).toThrow(
    new Error("Unexpected value: undefined"),
  );
  // @ts-expect-error A value from JavaScript can be outside the union.
  expect(() => formatPosition(7n)).toThrow(new Error("Unexpected value: 7"));
});
