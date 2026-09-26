import { renderToString } from "solid-js/web";
import { expect, test, vi } from "vitest";

import { AnchorProvider } from "src/context/AnchorProvider";
import { SESSION_STATUS_MARKUP } from "src/context/serverMarkup.fixture";
import { SessionStatus } from "src/context/SessionStatus.fixture";
import { createAnchor, signedIn } from "src/primitives/anchor.fixture";
import { useSession } from "src/primitives/useSession";
import type { RegisteredSessionState } from "src/types/Register";

test("a server render reads initializing and subscribes to nothing, whatever the Anchor holds, with no window", async () => {
  const { anchor, live } = createAnchor({ answer: signedIn("ada") });

  await anchor.start();

  const html = renderToString(() => (
    <AnchorProvider anchor={anchor}>
      <SessionStatus />
    </AnchorProvider>
  ));

  expect(typeof window).toBe("undefined");
  expect(html).toBe(SESSION_STATUS_MARKUP);
  expect(live.subscriptions).toBe(0);
});

test("the server state reads initializing, frozen, whatever the Anchor holds, and keeps one reference while that holds", async () => {
  const { anchor } = createAnchor({ answer: signedIn("ada") });
  const recordState = vi.fn<(state: RegisteredSessionState) => void>();

  const Probe = () => {
    recordState(useSession()());

    return null;
  };

  const renderProbe = () =>
    renderToString(() => (
      <AnchorProvider anchor={anchor}>
        <Probe />
      </AnchorProvider>
    ));

  renderProbe();
  await anchor.start();
  renderProbe();
  renderProbe();

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
