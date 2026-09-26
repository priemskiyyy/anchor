import { expect, test } from "vitest";

import { isFetchSettled } from "src/utils/isFetchSettled";

const settled = {
  data: null,
  error: null,
  isPending: false,
  isRefetching: false,
  refetch: async () => {},
};

test("a fetch has settled once it is neither pending nor refetching, whatever it answered", () => {
  expect(isFetchSettled(settled)).toBe(true);
  expect(isFetchSettled({ ...settled, error: { status: 500 } })).toBe(true);
  expect(isFetchSettled({ ...settled, isPending: true })).toBe(false);
  expect(isFetchSettled({ ...settled, isRefetching: true })).toBe(false);
});
