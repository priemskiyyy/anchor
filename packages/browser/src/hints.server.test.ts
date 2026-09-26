// @vitest-environment node
import { Anchor } from "@priemskiyyy/anchor";
import { createMockAdapter } from "@priemskiyyy/anchor/mock";
import { expect, test } from "vitest";

import { online } from "src/online";
import { visibility } from "src/visibility";

test("outside a browser, the page hints install nothing and the Anchor starts", async () => {
  const mock = createMockAdapter<{ name: string }>({
    answer: { status: "signed-out" },
  });

  const anchor = new Anchor({
    adapter: mock.adapter,
    hints: [visibility(), online()],
  });

  await anchor.start();

  expect(typeof window).toBe("undefined");
  expect(anchor.session.get()).toEqual({ status: "signed-out" });
  anchor.dispose();
});
