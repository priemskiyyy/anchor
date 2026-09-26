import { AnchorProvider } from "@priemskiyyy/anchor-vue";
import { expect, test } from "vitest";
import { defineComponent, h } from "vue";
import { renderToString } from "vue/server-renderer";

import { createAnchor } from "src/createAnchor.fixture";
import { spyOnAnchor } from "src/spyOnAnchor.fixture";
import { AnchorDevtools } from "src/vue";

test("on a server the Vue wrapper renders only its empty host element and observes nothing", async () => {
  const { mock, anchor } = createAnchor();
  const spy = spyOnAnchor(anchor);

  const Application = defineComponent(
    () => () =>
      h(
        AnchorProvider,
        { anchor },
        { default: () => h(AnchorDevtools, { initialIsOpen: true }) },
      ),
  );

  expect(typeof window).toBe("undefined");
  expect(await renderToString(h(Application))).toBe(
    "<!--[--><div data-anchor-devtools></div><!--]-->",
  );
  expect(spy.live).toEqual({ diagnostics: 0, "diagnostics.events": 0 });
  expect(mock.sessions).toEqual([]);
  expect(mock.reads).toEqual([]);
});
