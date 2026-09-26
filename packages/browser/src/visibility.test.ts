import { Anchor } from "@priemskiyyy/anchor";
import { createMockAdapter } from "@priemskiyyy/anchor/mock";
import { afterEach, expect, test, vi } from "vitest";

import { visibility } from "src/visibility";

type User = { name: string };

const setVisibility = (state: DocumentVisibilityState) => {
  vi.spyOn(document, "visibilityState", "get").mockReturnValue(state);
  document.dispatchEvent(new Event("visibilitychange"));
};

// Every read the mock settles has settled once a macrotask runs.
const tick = () =>
  new Promise((resolve) => {
    setTimeout(resolve, 0);
  });

afterEach(() => {
  vi.restoreAllMocks();
});

test("the page becoming visible reads the session again, becoming hidden reads nothing, and neither does anything before the start", async () => {
  const mock = createMockAdapter<User>({ answer: { status: "signed-out" } });
  const anchor = new Anchor({ adapter: mock.adapter, hints: [visibility()] });

  setVisibility("visible");

  expect(mock.reads).toHaveLength(0);

  await anchor.start();
  setVisibility("hidden");
  await tick();

  expect(mock.reads).toHaveLength(1);

  setVisibility("visible");
  await tick();

  expect(mock.reads).toHaveLength(2);
});

test("dispose removes exactly the listener the hint added", async () => {
  const added = vi.spyOn(document, "addEventListener");
  const removed = vi.spyOn(document, "removeEventListener");
  const mock = createMockAdapter<User>({ answer: { status: "signed-out" } });
  const anchor = new Anchor({ adapter: mock.adapter, hints: [visibility()] });

  await anchor.start();

  expect(added.mock.calls).toEqual([
    ["visibilitychange", expect.any(Function)],
  ]);

  anchor.dispose();

  expect(removed.mock.calls).toEqual(added.mock.calls);
});
