import { isPlainObject } from "src/utils/common/isPlainObject";

export const isStructurallyEqual = (left: unknown, right: unknown): boolean => {
  if (Object.is(left, right)) {
    return true;
  }

  if (Array.isArray(left)) {
    return (
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((item: unknown, index) =>
        isStructurallyEqual(item, right[index]),
      )
    );
  }

  if (!isPlainObject(left) || !isPlainObject(right)) {
    return false;
  }

  const keys = Object.keys(left);

  return (
    keys.length === Object.keys(right).length &&
    keys.every(
      (key) =>
        Object.hasOwn(right, key) && isStructurallyEqual(left[key], right[key]),
    )
  );
};
