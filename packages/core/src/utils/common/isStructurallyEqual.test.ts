import { expect, test } from "vitest";

import { isStructurallyEqual } from "src/utils/common/isStructurallyEqual";

test("plain data with the same content is equal whatever the key order", () => {
  expect(
    isStructurallyEqual(
      { name: "Ada", roles: ["admin"], team: { id: "t_1", size: 3 } },
      { team: { size: 3, id: "t_1" }, roles: ["admin"], name: "Ada" },
    ),
  ).toBe(true);
  expect(isStructurallyEqual(Number.NaN, Number.NaN)).toBe(true);
});

test("a changed value, a missing or extra key and a different length are not equal", () => {
  expect(isStructurallyEqual({ name: "Ada" }, { name: "Grace" })).toBe(false);
  expect(
    isStructurallyEqual({ name: "Ada" }, { name: "Ada", admin: true }),
  ).toBe(false);
  expect(
    isStructurallyEqual(
      { name: "Ada", admin: undefined },
      { name: "Ada", role: undefined },
    ),
  ).toBe(false);
  expect(isStructurallyEqual(["admin"], ["admin", "owner"])).toBe(false);
  expect(isStructurallyEqual(["admin"], { 0: "admin", length: 1 })).toBe(false);
  expect(isStructurallyEqual({ 0: "admin" }, ["admin"])).toBe(false);
});

test("values that are not plain data are equal only when they are the same value", () => {
  const joined = new Date(0);

  expect(isStructurallyEqual({ joined }, { joined })).toBe(true);
  expect(isStructurallyEqual({ joined }, { joined: new Date(0) })).toBe(false);
  expect(isStructurallyEqual(null, {})).toBe(false);
});
