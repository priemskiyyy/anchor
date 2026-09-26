import { isPlainObject } from "src/utils/common/isPlainObject";

const copyFrozenValue = (value: unknown, ancestors: Set<unknown>): unknown => {
  if (!Array.isArray(value) && !isPlainObject(value)) {
    return value;
  }

  if (ancestors.has(value)) {
    throw new TypeError("A value that contains itself cannot be copied.");
  }

  ancestors.add(value);

  const copied = Array.isArray(value)
    ? Array.from(value, (item: unknown) => copyFrozenValue(item, ancestors))
    : Object.fromEntries(
        Object.entries(value).map(([key, nested]) => [
          key,
          copyFrozenValue(nested, ancestors),
        ]),
      );

  ancestors.delete(value);

  return Object.freeze(copied);
};

// An overload keeps the caller's type: plain data is rebuilt as it was, and everything else is the same value.
export function copyFrozen<TValue>(value: TValue): TValue;

export function copyFrozen(value: unknown): unknown {
  return copyFrozenValue(value, new Set());
}
