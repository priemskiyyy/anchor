import { expect, test } from "vitest";

import { isAnsweredSessionState } from "src/utils/isAnsweredSessionState";

const settled = {
  data: null,
  error: null,
  isPending: false,
  isRefetching: false,
  refetch: async () => {},
};

test("a fetch that settled with a session, with none, or with a 401 is an answer, and a pending, refetching or failed one is not", () => {
  expect(isAnsweredSessionState(settled)).toBe(true);
  expect(isAnsweredSessionState({ ...settled, error: { status: 401 } })).toBe(
    true,
  );
  expect(isAnsweredSessionState({ ...settled, isPending: true })).toBe(false);
  expect(isAnsweredSessionState({ ...settled, isRefetching: true })).toBe(
    false,
  );
  expect(isAnsweredSessionState({ ...settled, error: { status: 500 } })).toBe(
    false,
  );
});
