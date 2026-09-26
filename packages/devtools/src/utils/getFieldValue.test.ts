import { expect, test } from "vitest";

import { getFieldValue } from "src/utils/getFieldValue";

test("an own field is read, even one named after a prototype member", () => {
  expect(getFieldValue({ operation: "token" }, "operation")).toBe("token");
  expect(getFieldValue({ operation: null }, "operation")).toBeNull();
  expect(
    getFieldValue(Object.fromEntries([["__proto__", "own"]]), "__proto__"),
  ).toBe("own");
});

test("a missing or inherited field, or a value that is not an object, reads as undefined", () => {
  expect(getFieldValue({ operation: "token" }, "code")).toBeUndefined();
  expect(getFieldValue({}, "toString")).toBeUndefined();
  expect(getFieldValue(null, "operation")).toBeUndefined();
  expect(getFieldValue(undefined, "operation")).toBeUndefined();
  expect(getFieldValue("token", "length")).toBeUndefined();
});
