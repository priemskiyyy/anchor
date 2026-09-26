import { afterEach, expect, test, vi } from "vitest";
import { createSSRApp, defineComponent, h, nextTick } from "vue";
import { renderToString } from "vue/server-renderer";

import { createAnchor, signedIn } from "src/composables/anchor.fixture";
import { useSession } from "src/composables/useSession";
import { AnchorProvider } from "src/context/AnchorProvider";

afterEach(() => {
  document.body.replaceChildren();
});

test("the client hydrates from the server's initializing without a mismatch, then shows the session", async () => {
  const { anchor } = createAnchor({ answer: signedIn("ada") });
  const warn = vi.spyOn(console, "warn");
  const error = vi.spyOn(console, "error");

  const Status = defineComponent(() => {
    const state = useSession();

    return () => h("span", state.value.status);
  });

  const createApp = () =>
    createSSRApp(() => h(AnchorProvider, { anchor }, () => h(Status)));

  const html = await renderToString(createApp());

  await anchor.start();

  const container = document.body.appendChild(document.createElement("div"));

  container.innerHTML = html;

  const app = createApp();

  app.mount(container);
  await nextTick();

  expect(container.innerHTML).toBe("<!--[--><span>signed-in</span><!--]-->");
  expect(warn.mock.calls).toEqual([]);
  expect(error.mock.calls).toEqual([]);

  app.unmount();
});
