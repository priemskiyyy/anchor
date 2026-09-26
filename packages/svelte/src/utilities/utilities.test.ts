import { cleanup, render } from "@testing-library/svelte";
import { flushSync } from "svelte";
import { afterEach, expect, test, vi } from "vitest";

import type { ReadableValue } from "../types/ReadableValue.js";
import type {
  RegisteredAnchor,
  RegisteredSessionState,
} from "../types/Register.js";
import { createAnchor, signedIn } from "./anchor.fixture.js";
import GreetingHarness from "./GreetingHarness.fixture.svelte";
import NestedProvidersHarness from "./NestedProvidersHarness.fixture.svelte";
import SessionStatusHarness from "./SessionStatusHarness.fixture.svelte";
import { useAnchor } from "./useAnchor.js";
import { useSession } from "./useSession.js";
import UtilityCaller from "./UtilityCaller.fixture.svelte";
import UtilityCallerHarness from "./UtilityCallerHarness.fixture.svelte";

afterEach(cleanup);

const getName = (state: RegisteredSessionState) => {
  if (state.status !== "signed-in") {
    return null;
  }

  const { user } = state.session;

  if (typeof user !== "object" || user === null || !("name" in user)) {
    return null;
  }

  return String(user.name);
};

const selectStatus = (state: RegisteredSessionState) => state.status;

test.each<[string, () => unknown]>([
  ["useAnchor", () => useAnchor()],
  ["useSession", () => useSession()],
  ["useSession with a selector", () => useSession(selectStatus)],
])(
  "%s outside a provider throws an AnchorError that names the provider",
  (_, callUtilities) => {
    expect(() => render(UtilityCaller, { callUtilities })).toThrow(
      expect.objectContaining({
        name: "AnchorError",
        code: "INVALID_CONFIGURATION",
        // Svelte appends the component stack to the message in development.
        message: expect.stringMatching(
          /^Anchor utilities must be used within an AnchorProvider\.\n\n\tin /,
        ),
      }),
    );
  },
);

test("useAnchor returns the nearest provider's Anchor", () => {
  const outer = createAnchor();
  const inner = createAnchor();
  const anchors: RegisteredAnchor[] = [];

  render(NestedProvidersHarness, {
    outer: outer.anchor,
    inner: inner.anchor,
    callUtilities: () => anchors.push(useAnchor()),
  });

  expect(anchors).toHaveLength(1);
  expect(anchors[0]).toBe(inner.anchor);
});

test("useSession follows the state through the first resolution and every change", async () => {
  const { mock, anchor } = createAnchor({ answer: signedIn("ada") });
  const names: ReadableValue<string | null>[] = [];
  const view = render(SessionStatusHarness, { props: { anchor } });

  render(UtilityCallerHarness, {
    props: { anchor, callUtilities: () => names.push(useSession(getName)) },
  });

  expect(view.container.textContent).toBe("initializing");

  await anchor.start();
  flushSync();

  expect(view.container.textContent).toBe("signed-in");
  expect(names[0]?.current).toBe("ada");

  mock.push(signedIn("ada", "Ada Lovelace"));
  flushSync();

  expect(names[0]?.current).toBe("Ada Lovelace");

  mock.push({ status: "signed-out" });
  flushSync();

  expect(view.container.textContent).toBe("signed-out");
  expect(names[0]?.current).toBe(null);
});

test("a selector updates its readers only when its selection changes", async () => {
  const { mock, anchor } = createAnchor({ answer: signedIn("ada") });
  const updates = vi.fn();
  const statuses: ReadableValue<RegisteredSessionState["status"]>[] = [];

  render(UtilityCallerHarness, {
    props: {
      anchor,
      callUtilities: () => statuses.push(useSession(selectStatus)),
      runInEffect: () => updates(statuses[0]?.current),
    },
  });
  await anchor.start();
  flushSync();
  mock.push(signedIn("ada", "Ada Lovelace"));
  flushSync();
  mock.push(signedIn("ada", "Countess of Lovelace"));
  flushSync();

  expect(updates.mock.calls).toEqual([["initializing"], ["signed-in"]]);

  mock.push({ status: "signed-out" });
  flushSync();

  expect(updates.mock.calls).toEqual([
    ["initializing"],
    ["signed-in"],
    ["signed-out"],
  ]);
});

test("a selection that stays NaN updates its readers once, because selections compare by Object.is", async () => {
  const { mock, anchor } = createAnchor({ answer: signedIn("ada") });
  const updates = vi.fn();
  const selections: ReadableValue<number>[] = [];

  render(UtilityCallerHarness, {
    props: {
      anchor,
      callUtilities: () => selections.push(useSession(() => Number.NaN)),
      runInEffect: () => updates(selections[0]?.current),
    },
  });
  await anchor.start();
  flushSync();
  mock.push({ status: "signed-out" });
  flushSync();

  expect(updates.mock.calls).toEqual([[Number.NaN]]);
});

test("an inline selector that builds a new object each call is stable between changes, updates once per change and warns nothing", async () => {
  const { mock, anchor } = createAnchor({ answer: signedIn("ada") });
  const warn = vi.spyOn(console, "warn");
  const error = vi.spyOn(console, "error");
  const updates = vi.fn();
  const profiles: ReadableValue<{ status: string; name: string | null }>[] = [];

  render(UtilityCallerHarness, {
    props: {
      anchor,
      callUtilities: () =>
        profiles.push(
          useSession((state) => ({
            status: state.status,
            name: getName(state),
          })),
        ),
      runInEffect: () => updates(profiles[0]?.current),
    },
  });
  await anchor.start();
  flushSync();
  mock.push(signedIn("ada", "Ada Lovelace"));
  flushSync();

  expect(profiles[0]?.current).toBe(profiles[0]?.current);
  expect(updates.mock.calls.map(([profile]) => profile)).toEqual([
    { status: "initializing", name: null },
    { status: "signed-in", name: "ada" },
    { status: "signed-in", name: "Ada Lovelace" },
  ]);
  expect(warn.mock.calls).toEqual([]);
  expect(error.mock.calls).toEqual([]);
});

test("mounting the provider and every utility starts, reads and mints nothing, and unmounting disposes nothing and leaves no listener", () => {
  const { mock, anchor, live } = createAnchor({ answer: signedIn("ada") });

  const view = render(UtilityCallerHarness, {
    props: {
      anchor,
      callUtilities: () => {
        useAnchor();
        useSession();
        useSession(selectStatus);
      },
    },
  });

  expect(live.subscriptions).toBe(2);

  view.unmount();

  expect(live.subscriptions).toBe(0);
  expect(mock.sessions).toEqual([]);
  expect(mock.reads).toEqual([]);
  expect(mock.tokens).toEqual([]);
  expect(anchor.diagnostics.get().state).toBe("idle");
});

test("a remount starts and disposes nothing, and the unmount leaves no listener", async () => {
  const { mock, anchor, live } = createAnchor({ answer: signedIn("ada") });

  await anchor.start();
  render(SessionStatusHarness, { props: { anchor } }).unmount();

  const view = render(SessionStatusHarness, { props: { anchor } });

  expect(view.container.textContent).toBe("signed-in");
  expect(live.subscriptions).toBe(1);

  view.unmount();

  expect(live.subscriptions).toBe(0);
  expect(mock.sessions.map(({ disposeCount }) => disposeCount)).toEqual([0]);
  expect(anchor.diagnostics.get().state).toBe("started");
});

test("a replaced Anchor moves the utilities to it and releases every listener on the previous one", async () => {
  const first = createAnchor({ answer: signedIn("ada") });
  const second = createAnchor({ answer: signedIn("grace") });
  const names: ReadableValue<string | null>[] = [];

  await first.anchor.start();
  await second.anchor.start();

  const view = render(UtilityCallerHarness, {
    props: {
      anchor: first.anchor,
      callUtilities: () => names.push(useSession(getName)),
    },
  });

  expect(names[0]?.current).toBe("ada");

  await view.rerender({ anchor: second.anchor });

  expect(names[0]?.current).toBe("grace");
  expect(first.live.subscriptions).toBe(0);
  expect(second.live.subscriptions).toBe(1);
});

test("a selector that closes over a prop reads the new prop, with no change of state", async () => {
  const { anchor } = createAnchor({ answer: signedIn("ada") });

  await anchor.start();

  const view = render(GreetingHarness, {
    props: { anchor, greeting: "Hello" },
  });

  expect(view.container.textContent).toBe("Hello signed-in");

  await view.rerender({ greeting: "Welcome back" });

  expect(view.container.textContent).toBe("Welcome back signed-in");
});
