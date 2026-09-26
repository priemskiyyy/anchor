import { runInNewContext } from "node:vm";
import { expect, test } from "vitest";

import { isPlainObject } from "src/utils/common/isPlainObject";

test("a plain object, an object without a prototype and a plain object from another realm are plain", () => {
  expect(isPlainObject({ user: { id: "ada" } })).toBe(true);
  expect(isPlainObject(Object.create(null))).toBe(true);
  expect(isPlainObject(runInNewContext("({ subject: 'ada' })"))).toBe(true);
});

test("an array, a Map, a Date, a class instance, null, a primitive and a function are not plain", () => {
  expect(isPlainObject(["ada"])).toBe(false);
  expect(isPlainObject(new Map())).toBe(false);
  expect(isPlainObject(new Date(0))).toBe(false);
  expect(isPlainObject(new (class FirebaseUser {})())).toBe(false);
  expect(isPlainObject(null)).toBe(false);
  expect(isPlainObject("ada")).toBe(false);
  expect(isPlainObject(() => {})).toBe(false);
});

test("an object whose prototype cannot be read is not plain, and asking never throws", () => {
  const { proxy, revoke } = Proxy.revocable({}, {});

  const trapped = new Proxy(
    {},
    {
      getPrototypeOf: () => {
        throw new Error("getPrototypeOf trap");
      },
    },
  );

  revoke();

  expect(isPlainObject(proxy)).toBe(false);
  expect(isPlainObject(trapped)).toBe(false);
});
