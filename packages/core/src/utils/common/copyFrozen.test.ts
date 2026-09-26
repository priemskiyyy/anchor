import { expect, test } from "vitest";

import { copyFrozen } from "src/utils/common/copyFrozen";

test("plain data is copied at every level and every level of the copy is frozen", () => {
  const user = { name: "Ada", roles: ["admin", "owner"], team: { id: "t_1" } };
  const copied = copyFrozen(user);

  user.name = "Grace";
  user.roles.push("billing");
  user.team.id = "t_2";

  expect(copied).toEqual({
    name: "Ada",
    roles: ["admin", "owner"],
    team: { id: "t_1" },
  });
  expect(Object.isFrozen(copied)).toBe(true);
  expect(Object.isFrozen(copied.roles)).toBe(true);
  expect(Object.isFrozen(copied.team)).toBe(true);
  expect(Object.isFrozen(user)).toBe(false);
});

test("a value that is not plain data is kept as it is and never frozen", () => {
  const joined = new Date(0);
  const photo = new URL("https://example.com/ada.png");
  const copied = copyFrozen({ joined, photo });

  expect(copied.joined).toBe(joined);
  expect(copied.photo).toBe(photo);
  expect(Object.isFrozen(joined)).toBe(false);
  expect(copyFrozen("ada")).toBe("ada");
  expect(copyFrozen(null)).toBe(null);
});

test("a hole in an array becomes an explicit undefined", () => {
  const sparse: number[] = [];

  sparse[0] = 1;
  sparse[2] = 3;

  const copied = copyFrozen(sparse);

  expect(Object.hasOwn(copied, 1)).toBe(true);
  expect(copied).toEqual([1, undefined, 3]);
});

test("a key named __proto__ stays an own key of the copy", () => {
  const copied = copyFrozen(JSON.parse('{"__proto__": {"admin": true}}'));

  expect(Object.hasOwn(copied, "__proto__")).toBe(true);
  expect(Object.getPrototypeOf(copied)).toBe(Object.prototype);
});

test("a value that contains itself is refused, and a shared value is copied at each place", () => {
  const cycle: { self?: unknown } = {};

  cycle.self = cycle;

  const shared = { id: "t_1" };

  expect(() => copyFrozen(cycle)).toThrow(
    new TypeError("A value that contains itself cannot be copied."),
  );
  expect(copyFrozen({ first: shared, second: shared })).toEqual({
    first: { id: "t_1" },
    second: { id: "t_1" },
  });
});
