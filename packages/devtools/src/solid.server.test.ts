import { AnchorProvider } from "@priemskiyyy/anchor-solid";
import { createComponent } from "solid-js";
import { renderToString } from "solid-js/web";
import { expect, test } from "vitest";

import { createAnchor } from "src/createAnchor.fixture";
import { AnchorDevtools } from "src/solid";
import { spyOnAnchor } from "src/spyOnAnchor.fixture";

test("on a server the Solid wrapper renders only its empty host element and observes nothing", () => {
  const { mock, anchor } = createAnchor();
  const spy = spyOnAnchor(anchor);

  expect(typeof window).toBe("undefined");
  expect(
    renderToString(() =>
      createComponent(AnchorProvider, {
        anchor,
        get children() {
          return createComponent(AnchorDevtools, { initialIsOpen: true });
        },
      }),
    ),
  ).toBe('<div data-hk="00000" data-anchor-devtools=""></div>');
  expect(spy.live).toEqual({ diagnostics: 0, "diagnostics.events": 0 });
  expect(mock.sessions).toEqual([]);
  expect(mock.reads).toEqual([]);
});
