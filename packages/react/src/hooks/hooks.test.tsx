import {
  act,
  cleanup,
  render,
  renderHook,
  screen,
} from "@testing-library/react";
import { StrictMode } from "react";
import type { PropsWithChildren } from "react";
import { afterEach, expect, test, vi } from "vitest";

import { AnchorProvider } from "src/context/AnchorProvider";
import { createAnchor, signedIn } from "src/hooks/anchor.fixture";
import { useAnchor } from "src/hooks/useAnchor";
import { useSession } from "src/hooks/useSession";
import type { RegisteredSessionState } from "src/types/Register";

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
  (_, useHook) => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => renderHook(useHook)).toThrow(
      expect.objectContaining({
        name: "AnchorError",
        code: "INVALID_CONFIGURATION",
        message: "Anchor hooks must be used within an AnchorProvider.",
      }),
    );
  },
);

test("useAnchor returns the nearest provider's Anchor", () => {
  const outer = createAnchor();
  const inner = createAnchor();

  const wrapper = ({ children }: PropsWithChildren) => (
    <AnchorProvider anchor={outer.anchor}>
      <AnchorProvider anchor={inner.anchor}>{children}</AnchorProvider>
    </AnchorProvider>
  );

  expect(renderHook(() => useAnchor(), { wrapper }).result.current).toBe(
    inner.anchor,
  );
});

test("useSession follows the state through the first resolution and every change", async () => {
  const { mock, anchor } = createAnchor({ answer: signedIn("ada") });

  const Status = () => {
    const state = useSession();

    return (
      <p>
        {state.status === "signed-in"
          ? `${state.status}:${getName(state)}`
          : state.status}
      </p>
    );
  };

  render(
    <AnchorProvider anchor={anchor}>
      <Status />
    </AnchorProvider>,
  );

  expect(screen.getByText("initializing")).toBeDefined();

  await act(() => anchor.start());

  expect(screen.getByText("signed-in:ada")).toBeDefined();

  act(() => mock.push({ status: "signed-out" }));

  expect(screen.getByText("signed-out")).toBeDefined();
});

test("a selector renders again only when its selection changes", async () => {
  const { mock, anchor } = createAnchor({ answer: signedIn("ada") });
  const renders = vi.fn();

  const Status = () => {
    const status = useSession(selectStatus);

    renders(status);

    return <p>{status}</p>;
  };

  render(
    <AnchorProvider anchor={anchor}>
      <Status />
    </AnchorProvider>,
  );
  await act(() => anchor.start());

  act(() => mock.push(signedIn("ada", "Ada Lovelace")));
  act(() => mock.push(signedIn("ada", "Countess of Lovelace")));

  expect(renders.mock.calls).toEqual([["initializing"], ["signed-in"]]);

  act(() => mock.push({ status: "signed-out" }));

  expect(renders.mock.calls.at(-1)).toEqual(["signed-out"]);
});

test("an inline selector that builds a new object each call stays stable within a render and warns nothing", async () => {
  const { mock, anchor } = createAnchor({ answer: signedIn("ada") });
  const errors = vi.spyOn(console, "error");
  const renders = vi.fn();

  const Profile = () => {
    const profile = useSession((state) => ({
      status: state.status,
      name: getName(state),
    }));

    renders(profile);

    return <p>{`${profile.status}:${profile.name}`}</p>;
  };

  render(
    <AnchorProvider anchor={anchor}>
      <Profile />
    </AnchorProvider>,
  );
  await act(() => anchor.start());
  act(() => mock.push(signedIn("ada", "Ada Lovelace")));

  expect(screen.getByText("signed-in:Ada Lovelace")).toBeDefined();
  expect(renders.mock.calls.map(([profile]) => profile)).toEqual([
    { status: "initializing", name: null },
    { status: "signed-in", name: "ada" },
    { status: "signed-in", name: "Ada Lovelace" },
  ]);
  expect(errors.mock.calls).toEqual([]);
});

test("mounting the provider and every hook starts, reads and mints nothing, and unmounting disposes nothing and leaves no listener", () => {
  const { mock, anchor, live } = createAnchor({ answer: signedIn("ada") });

  const Probe = () => {
    useAnchor();
    useSession();
    useSession(selectStatus);

    return null;
  };

  const view = render(
    <AnchorProvider anchor={anchor}>
      <Probe />
    </AnchorProvider>,
  );

  expect(live.subscriptions).toBe(2);

  view.unmount();

  expect(live.subscriptions).toBe(0);
  expect(mock.sessions).toEqual([]);
  expect(mock.reads).toEqual([]);
  expect(mock.tokens).toEqual([]);
  expect(anchor.diagnostics.get().state).toBe("idle");
});

test("in Strict Mode the double mount starts and disposes nothing, and the unmount leaves no listener", async () => {
  const { mock, anchor, live } = createAnchor({ answer: signedIn("ada") });

  const Status = () => <p>{useSession().status}</p>;

  await anchor.start();

  const view = render(
    <StrictMode>
      <AnchorProvider anchor={anchor}>
        <Status />
      </AnchorProvider>
    </StrictMode>,
  );

  expect(screen.getByText("signed-in")).toBeDefined();
  expect(mock.sessions.map(({ disposeCount }) => disposeCount)).toEqual([0]);

  view.unmount();

  expect(live.subscriptions).toBe(0);
  expect(mock.sessions.map(({ disposeCount }) => disposeCount)).toEqual([0]);
  expect(anchor.diagnostics.get().state).toBe("started");
});

test("a replaced Anchor moves the hooks to it and releases every listener on the previous one", async () => {
  const first = createAnchor({ answer: signedIn("ada") });
  const second = createAnchor({ answer: signedIn("grace") });

  await first.anchor.start();
  await second.anchor.start();

  const Name = () => <p>{getName(useSession())}</p>;

  const view = render(
    <AnchorProvider anchor={first.anchor}>
      <Name />
    </AnchorProvider>,
  );

  expect(screen.getByText("ada")).toBeDefined();

  view.rerender(
    <AnchorProvider anchor={second.anchor}>
      <Name />
    </AnchorProvider>,
  );

  expect(screen.getByText("grace")).toBeDefined();
  expect(first.live.subscriptions).toBe(0);
  expect(second.live.subscriptions).toBe(1);
});

test("a selector that closes over a prop reads the new prop on the next render, with no change of state", async () => {
  const { anchor } = createAnchor({ answer: signedIn("ada") });

  await anchor.start();

  const Greeting = ({ greeting }: { greeting: string }) => (
    <p>{useSession((state) => `${greeting} ${getName(state)}`)}</p>
  );

  const view = render(
    <AnchorProvider anchor={anchor}>
      <Greeting greeting="Hello" />
    </AnchorProvider>,
  );

  expect(screen.getByText("Hello ada")).toBeDefined();

  view.rerender(
    <AnchorProvider anchor={anchor}>
      <Greeting greeting="Welcome back" />
    </AnchorProvider>,
  );

  expect(screen.getByText("Welcome back ada")).toBeDefined();
});
