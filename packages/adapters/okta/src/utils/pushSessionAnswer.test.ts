import { expect, test, vi } from "vitest";

import { pushSessionAnswer } from "src/utils/pushSessionAnswer";

test("an answer is pushed to the observer as it is", () => {
  const observer = { session: vi.fn(), invalidate: vi.fn() };

  pushSessionAnswer(observer, () => ({ status: "signed-out" }));

  expect(observer.session.mock.calls).toEqual([[{ status: "signed-out" }]]);
  expect(observer.invalidate.mock.calls).toEqual([]);
});

test("an answer that cannot be made asks for a read instead of throwing into the SDK", () => {
  const observer = { session: vi.fn(), invalidate: vi.fn() };

  expect(() =>
    pushSessionAnswer(observer, () => {
      throw new Error("The mapper failed.");
    }),
  ).not.toThrow();
  expect(observer.session.mock.calls).toEqual([]);
  expect(observer.invalidate.mock.calls).toEqual([[]]);
});
