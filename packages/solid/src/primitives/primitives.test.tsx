import { cleanup, render, screen } from "@solidjs/testing-library";
import { createEffect, createSignal } from "solid-js";
import type { JSX } from "solid-js";
import { afterEach, expect, test, vi } from "vitest";

import { AnchorProvider } from "src/context/AnchorProvider";
import { createAnchor, signedIn } from "src/primitives/anchor.fixture";
import { useAnchor } from "src/primitives/useAnchor";
import { useSession } from "src/primitives/useSession";
import type {
  RegisteredAnchor,
  RegisteredSessionState,
} from "src/types/Register";

afterEach(cleanup);

const renderInProvider = (
  initial: RegisteredAnchor,
  child: () => JSX.Element,
) => {
  const [anchor, setAnchor] = createSignal(initial);

  const view = render(() => (
    <AnchorProvider anchor={anchor()}>{child()}</AnchorProvider>
  ));

  return { view, setAnchor };
};

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

const Status = () => {
  const state = useSession();

  return <p>{state().status}</p>;
};

test.each<[string, () => unknown]>([
  ["useAnchor", () => useAnchor()],
  ["useSession", () => useSession()],
  ["useSession with a selector", () => useSession(selectStatus)],
])(
  "%s outside a provider throws an AnchorError that names the provider",
  (_, usePrimitive) => {
    const Probe = () => {
      usePrimitive();

      return null;
    };

    expect(() => render(() => <Probe />)).toThrow(
      expect.objectContaining({
        name: "AnchorError",
        code: "INVALID_CONFIGURATION",
        message: "Anchor primitives must be used within an AnchorProvider.",
      }),
    );
  },
);

test("useAnchor returns the nearest provider's Anchor", () => {
  const outer = createAnchor();
  const inner = createAnchor();
  const anchors: RegisteredAnchor[] = [];

  const AnchorCollector = () => {
    anchors.push(useAnchor());

    return null;
  };

  render(() => (
    <AnchorProvider anchor={outer.anchor}>
      <AnchorProvider anchor={inner.anchor}>
        <AnchorCollector />
      </AnchorProvider>
    </AnchorProvider>
  ));

  expect(anchors).toHaveLength(1);
  expect(anchors[0]).toBe(inner.anchor);
});

test("useSession follows the state through the first resolution and every change", async () => {
  const { mock, anchor } = createAnchor({ answer: signedIn("ada") });

  const StatusAndName = () => {
    const state = useSession();

    return (
      <p>
        {state().status === "signed-in"
          ? `${state().status}:${getName(state())}`
          : state().status}
      </p>
    );
  };

  renderInProvider(anchor, () => <StatusAndName />);

  expect(screen.getByText("initializing")).toBeDefined();

  await anchor.start();

  expect(screen.getByText("signed-in:ada")).toBeDefined();

  mock.push({ status: "signed-out" });

  expect(screen.getByText("signed-out")).toBeDefined();
});

test("a selector updates its readers only when its selection changes", async () => {
  const { mock, anchor } = createAnchor({ answer: signedIn("ada") });
  const updates = vi.fn();

  const SelectedStatus = () => {
    const status = useSession(selectStatus);

    createEffect(() => {
      updates(status());
    });

    return null;
  };

  renderInProvider(anchor, () => <SelectedStatus />);
  await anchor.start();
  mock.push(signedIn("ada", "Ada Lovelace"));
  mock.push(signedIn("ada", "Countess of Lovelace"));

  expect(updates.mock.calls).toEqual([["initializing"], ["signed-in"]]);

  mock.push({ status: "signed-out" });

  expect(updates.mock.calls).toEqual([
    ["initializing"],
    ["signed-in"],
    ["signed-out"],
  ]);
});

test("a selection that stays NaN updates its readers once, because selections compare by Object.is", async () => {
  const { mock, anchor } = createAnchor({ answer: signedIn("ada") });
  const updates = vi.fn();

  const NaNSelection = () => {
    const unknown = useSession(() => Number.NaN);

    createEffect(() => {
      updates(unknown());
    });

    return null;
  };

  renderInProvider(anchor, () => <NaNSelection />);
  await anchor.start();
  mock.push({ status: "signed-out" });

  expect(updates.mock.calls).toEqual([[Number.NaN]]);
});

test("an inline selector that builds a new object each call updates once per change and warns nothing", async () => {
  const { mock, anchor } = createAnchor({ answer: signedIn("ada") });
  const warn = vi.spyOn(console, "warn");
  const error = vi.spyOn(console, "error");
  const updates = vi.fn();

  const Profile = () => {
    const profile = useSession((state) => ({
      status: state.status,
      name: getName(state),
    }));

    createEffect(() => {
      updates(profile());
    });

    return <p>{`${profile().status}:${profile().name}`}</p>;
  };

  renderInProvider(anchor, () => <Profile />);
  await anchor.start();
  mock.push(signedIn("ada", "Ada Lovelace"));

  expect(screen.getByText("signed-in:Ada Lovelace")).toBeDefined();
  expect(updates.mock.calls.map(([profile]) => profile)).toEqual([
    { status: "initializing", name: null },
    { status: "signed-in", name: "ada" },
    { status: "signed-in", name: "Ada Lovelace" },
  ]);
  expect(warn.mock.calls).toEqual([]);
  expect(error.mock.calls).toEqual([]);
});

test("mounting the provider and every primitive starts, reads and mints nothing, and unmounting disposes nothing and leaves no listener", () => {
  const { mock, anchor, live } = createAnchor({ answer: signedIn("ada") });

  const Probe = () => {
    useAnchor();
    useSession();
    useSession(selectStatus);

    return null;
  };

  const { view } = renderInProvider(anchor, () => <Probe />);

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
  renderInProvider(anchor, () => <Status />).view.unmount();

  const { view } = renderInProvider(anchor, () => <Status />);

  expect(view.container.textContent).toBe("signed-in");
  expect(live.subscriptions).toBe(1);

  view.unmount();

  expect(live.subscriptions).toBe(0);
  expect(mock.sessions.map(({ disposeCount }) => disposeCount)).toEqual([0]);
  expect(anchor.diagnostics.get().state).toBe("started");
});

test("a replaced Anchor moves the primitives to it and releases every listener on the previous one", async () => {
  const first = createAnchor({ answer: signedIn("ada") });
  const second = createAnchor({ answer: signedIn("grace") });

  await first.anchor.start();
  await second.anchor.start();

  const Name = () => {
    const state = useSession();

    return <p>{getName(state())}</p>;
  };

  const { setAnchor } = renderInProvider(first.anchor, () => <Name />);

  expect(screen.getByText("ada")).toBeDefined();

  setAnchor(() => second.anchor);

  expect(screen.getByText("grace")).toBeDefined();
  expect(first.live.subscriptions).toBe(0);
  expect(second.live.subscriptions).toBe(1);
});

test("a selector that closes over a prop reads the new prop, with no change of state", async () => {
  const { anchor } = createAnchor({ answer: signedIn("ada") });
  const [greeting, setGreeting] = createSignal("Hello");

  await anchor.start();

  const Greeting = (props: { greeting: string }) => {
    const text = useSession((state) => `${props.greeting} ${getName(state)}`);

    return <p>{text()}</p>;
  };

  renderInProvider(anchor, () => <Greeting greeting={greeting()} />);

  expect(screen.getByText("Hello ada")).toBeDefined();

  setGreeting("Welcome back");

  expect(screen.getByText("Welcome back ada")).toBeDefined();
});
