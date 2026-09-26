import { Anchor } from "@priemskiyyy/anchor";
import { createMockAdapter } from "@priemskiyyy/anchor/mock";
import { afterEach, expect, test, vi } from "vitest";

import { online } from "src/online";

type User = { name: string };

afterEach(() => {
  vi.restoreAllMocks();
});

test("the browser coming back online reads the session again, and only once the Anchor has started", async () => {
  const mock = createMockAdapter<User>({ answer: { status: "signed-out" } });
  const anchor = new Anchor({ adapter: mock.adapter, hints: [online()] });

  window.dispatchEvent(new Event("online"));

  expect(mock.reads).toHaveLength(0);

  await anchor.start();
  window.dispatchEvent(new Event("online"));

  expect(mock.reads).toHaveLength(2);
});

test("dispose removes exactly the listener the hint added", async () => {
  const added = vi.spyOn(window, "addEventListener");
  const removed = vi.spyOn(window, "removeEventListener");
  const mock = createMockAdapter<User>({ answer: { status: "signed-out" } });
  const anchor = new Anchor({ adapter: mock.adapter, hints: [online()] });

  await anchor.start();

  expect(added.mock.calls).toEqual([["online", expect.any(Function)]]);

  anchor.dispose();

  expect(removed.mock.calls).toEqual(added.mock.calls);
});
