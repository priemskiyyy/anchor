import { render } from "svelte/server";
import { expect, test, vi } from "vitest";

import type { RegisteredSessionState } from "../types/Register.js";
import { createAnchor, signedIn } from "../utilities/anchor.fixture.js";
import SessionStatusHarness from "../utilities/SessionStatusHarness.fixture.svelte";
import { useSession } from "../utilities/useSession.js";
import UtilityCallerHarness from "../utilities/UtilityCallerHarness.fixture.svelte";
import { SESSION_STATUS_MARKUP } from "./serverMarkup.fixture.js";

test("a server render reads initializing and subscribes to nothing, whatever the Anchor holds, with no window", async () => {
  const { anchor, live } = createAnchor({ answer: signedIn("ada") });

  await anchor.start();

  const { body } = render(SessionStatusHarness, { props: { anchor } });

  expect(typeof window).toBe("undefined");
  expect(body).toBe(SESSION_STATUS_MARKUP);
  expect(live.subscriptions).toBe(0);
});

test("the server state reads initializing, frozen, whatever the Anchor holds, and keeps one reference while that holds", async () => {
  const { anchor } = createAnchor({ answer: signedIn("ada") });
  const recordState = vi.fn<(state: RegisteredSessionState) => void>();
  const callUtilities = () => recordState(useSession().current);

  const renderOnServer = () =>
    render(UtilityCallerHarness, { props: { anchor, callUtilities } }).body;

  renderOnServer();
  await anchor.start();
  renderOnServer();
  renderOnServer();

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
