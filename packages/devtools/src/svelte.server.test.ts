import { render } from "svelte/server";
import { expect, test } from "vitest";

import { createAnchor } from "src/createAnchor.fixture";
import { spyOnAnchor } from "src/spyOnAnchor.fixture";
import Fixture from "src/svelte.fixture.svelte";

test("on a server the Svelte attachment never runs, so its host element stays empty and nothing is observed", () => {
  const { mock, anchor } = createAnchor();
  const spy = spyOnAnchor(anchor);

  expect(typeof window).toBe("undefined");
  expect(
    render(Fixture, { props: { anchor, options: { initialIsOpen: true } } })
      .body,
  ).toBe("<!--[--><!--[0--><div></div><!----><!--]--><!--]-->");
  expect(spy.live).toEqual({ diagnostics: 0, "diagnostics.events": 0 });
  expect(mock.sessions).toEqual([]);
  expect(mock.reads).toEqual([]);
});
