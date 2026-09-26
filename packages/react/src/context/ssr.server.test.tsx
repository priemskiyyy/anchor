import { renderToString } from "react-dom/server";
import { expect, test, vi } from "vitest";

import { AnchorProvider } from "src/context/AnchorProvider";
import { createAnchor, signedIn } from "src/hooks/anchor.fixture";
import { useSession } from "src/hooks/useSession";
import type {
  RegisteredAnchor,
  RegisteredSessionState,
} from "src/types/Register";

const Status = () => <span>{useSession().status}</span>;

test("a server render reads initializing and subscribes to nothing, whatever the Anchor holds, with no window", async () => {
  const { anchor, live } = createAnchor({ answer: signedIn("ada") });

  await anchor.start();

  const html = renderToString(
    <AnchorProvider anchor={anchor}>
      <Status />
    </AnchorProvider>,
  );

  expect(typeof window).toBe("undefined");
  expect(html).toBe("<span>initializing</span>");
  expect(live.subscriptions).toBe(0);
});

test("the server state reads initializing, frozen, whatever the Anchor holds, and keeps one reference while that holds", async () => {
  const { anchor } = createAnchor({ answer: signedIn("ada") });
  const recordState = vi.fn<(state: RegisteredSessionState) => void>();

  const Probe = () => {
    recordState(useSession());

    return null;
  };

  const renderOnServer = (current: RegisteredAnchor) =>
    renderToString(
      <AnchorProvider anchor={current}>
        <Probe />
      </AnchorProvider>,
    );

  renderOnServer(anchor);
  await anchor.start();
  renderOnServer(anchor);
  renderOnServer(anchor);

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
