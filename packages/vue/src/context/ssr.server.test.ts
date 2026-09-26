import { expect, test, vi } from "vitest";
import { createSSRApp, defineComponent, h } from "vue";
import type { Component } from "vue";
import { renderToString } from "vue/server-renderer";

import { createAnchor, signedIn } from "src/composables/anchor.fixture";
import { useSession } from "src/composables/useSession";
import { AnchorProvider } from "src/context/AnchorProvider";
import type {
  RegisteredAnchor,
  RegisteredSessionState,
} from "src/types/Register";

const renderOnServer = (anchor: RegisteredAnchor, child: Component) =>
  renderToString(
    createSSRApp(() => h(AnchorProvider, { anchor }, () => h(child))),
  );

test("a server render reads initializing and subscribes to nothing, whatever the Anchor holds, with no window", async () => {
  const { anchor, live } = createAnchor({ answer: signedIn("ada") });

  const Status = defineComponent(() => {
    const state = useSession();

    return () => h("span", state.value.status);
  });

  await anchor.start();

  const html = await renderOnServer(anchor, Status);

  expect(typeof window).toBe("undefined");
  expect(html).toBe("<!--[--><span>initializing</span><!--]-->");
  expect(live.subscriptions).toBe(0);
});

test("the server state reads initializing, frozen, whatever the Anchor holds, and keeps one reference while that holds", async () => {
  const { anchor } = createAnchor({ answer: signedIn("ada") });
  const recordState = vi.fn<(state: RegisteredSessionState) => void>();

  const Probe = defineComponent(() => {
    const state = useSession();

    return () => {
      recordState(state.value);

      return null;
    };
  });

  await renderOnServer(anchor, Probe);
  await anchor.start();
  await renderOnServer(anchor, Probe);
  await renderOnServer(anchor, Probe);

  const [first, second, third] = recordState.mock.calls;

  expect(recordState.mock.calls).toEqual([
    [{ status: "initializing" }],
    [{ status: "initializing" }],
    [{ status: "initializing" }],
  ]);
  expect(third?.[0]).toBe(second?.[0]);
  expect(Object.isFrozen(first?.[0])).toBe(true);
  expect(Object.isFrozen(second?.[0])).toBe(true);
});
