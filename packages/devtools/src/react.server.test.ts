import { AnchorProvider } from "@priemskiyyy/anchor-react";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { expect, test } from "vitest";

import { createAnchor } from "src/createAnchor.fixture";
import { AnchorDevtools } from "src/react";
import { spyOnAnchor } from "src/spyOnAnchor.fixture";

test("on a server the React wrapper renders only its empty host element and observes nothing", () => {
  const { mock, anchor } = createAnchor();
  const spy = spyOnAnchor(anchor);

  expect(typeof window).toBe("undefined");
  expect(
    renderToString(
      createElement(
        AnchorProvider,
        { anchor },
        createElement(AnchorDevtools, { initialIsOpen: true }),
      ),
    ),
  ).toBe('<div data-anchor-devtools=""></div>');
  expect(spy.live).toEqual({ diagnostics: 0, "diagnostics.events": 0 });
  expect(mock.sessions).toEqual([]);
  expect(mock.reads).toEqual([]);
});
