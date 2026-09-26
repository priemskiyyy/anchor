import type { Anchor, SessionObserver } from "@priemskiyyy/anchor";
import { fireEvent, waitFor, within } from "@testing-library/dom";
import { afterEach, expect, test, vi } from "vitest";

import { AnchorDevtools } from "src/AnchorDevtools";
import { AUTHORITY, createAnchor, signedIn } from "src/createAnchor.fixture";
import { spyOnAnchor } from "src/spyOnAnchor.fixture";
import { styles } from "src/styles";
import type { AnchorDevtoolsOptions } from "src/types/AnchorDevtoolsOptions";

const PREFERENCES_KEY = "@priemskiyyy/anchor-devtools";

afterEach(() => {
  vi.useRealTimers();
  Reflect.deleteProperty(navigator, "clipboard");
  document.body.replaceChildren();
  localStorage.clear();
});

const getSignedInSession = (anchor: Anchor<unknown, unknown, string>) => {
  const state = anchor.session.get();

  if (state.status !== "signed-in") {
    throw new Error("Expected a signed-in session");
  }

  return state.session;
};

const mountDevtools = (options: AnchorDevtoolsOptions) => {
  const host = document.body.appendChild(document.createElement("div"));
  const devtools = new AnchorDevtools(options);

  devtools.mount(host);

  // Queries need an element, and the shadow root's only child is the application root.
  const getView = () => {
    const root = host.shadowRoot?.firstElementChild;

    if (!(root instanceof HTMLElement)) {
      throw new Error("Expected the devtools root inside the shadow root");
    }

    return within(root);
  };

  const getPanel = () =>
    getView().getByRole("complementary", { name: "Anchor devtools" });

  const getRows = () =>
    Array.from(
      getView()
        .queryByLabelText("Event timeline")
        ?.querySelectorAll("details") ?? [],
    );

  const getRowTypes = () =>
    getRows().map((row) => row.querySelector(".event-type")?.textContent);

  const getRowCells = () =>
    getRows().map((row) => [
      row.querySelector(".event-type")?.textContent,
      row.querySelector(".event-session")?.textContent,
      row.querySelector(".event-summary")?.textContent,
    ]);

  const getLifecycle = () => getPanel().querySelector(".status")?.textContent;

  const getSessionLine = () =>
    getPanel().querySelector(".session")?.textContent;

  const getPrincipal = () =>
    getPanel().querySelector(".principal")?.textContent ?? null;

  const getOperationLines = () =>
    Array.from(
      getView()
        .getByRole("region", { name: "Operations in flight" })
        .querySelectorAll("li"),
      (item) => item.textContent,
    );

  const getGroupChips = () =>
    within(getView().getByRole("group", { name: "Event groups" }));

  const getLauncherDotState = () =>
    getView()
      .getByRole("button", { name: "Open Anchor devtools" })
      .querySelector(".dot")
      ?.getAttribute("data-state");

  return {
    host,
    devtools,
    getView,
    getPanel,
    getRows,
    getRowTypes,
    getRowCells,
    getLifecycle,
    getSessionLine,
    getPrincipal,
    getOperationLines,
    getGroupChips,
    getLauncherDotState,
  };
};

test("the panel observes an Anchor without starting it, reading, minting or ending", () => {
  const { mock, anchor } = createAnchor({ answer: signedIn("ada_lovelace") });
  const spy = spyOnAnchor(anchor);

  const {
    devtools,
    host,
    getView,
    getLifecycle,
    getSessionLine,
    getPrincipal,
    getOperationLines,
  } = mountDevtools({ anchor, initialIsOpen: true });

  expect(spy.live).toEqual({ diagnostics: 1, "diagnostics.events": 1 });
  expect(mock.sessions).toEqual([]);
  expect(mock.reads).toEqual([]);
  expect(mock.tokens).toEqual([]);
  expect(mock.ends).toEqual([]);
  expect(anchor.diagnostics.get().state).toBe("idle");
  expect(getLifecycle()).toBe("idle");
  expect(getSessionLine()).toBe("mocked · initializing · generation #0");
  expect(getPrincipal()).toBeNull();
  expect(getOperationLines()).toEqual([]);
  expect(getView().getByText("None").tagName).toBe("P");
  expect(host.shadowRoot?.querySelector("style")?.textContent).toBe(styles);
  expect(styles).toContain("@media (prefers-color-scheme: light)");
  devtools.unmount();
});

test("the header follows the lifecycle, the adapter, the session status, the generation and the session key", async () => {
  const { mock, anchor } = createAnchor({
    answer: signedIn("ada_lovelace"),
    hold: { read: true },
  });

  const { devtools, getLifecycle, getSessionLine } = mountDevtools({
    anchor,
    initialIsOpen: true,
  });

  const started = anchor.start();

  await waitFor(() => expect(getLifecycle()).toBe("starting"));

  mock.reads[0]?.settle();
  await started;

  const { key } = getSignedInSession(anchor);

  await waitFor(() => expect(getLifecycle()).toBe("started"));
  expect(getSessionLine()).toBe(
    `mocked · signed-in · generation #1 · key ${key}`,
  );

  mock.push({ status: "signed-out" });

  await waitFor(() =>
    expect(getSessionLine()).toBe("mocked · signed-out · generation #2"),
  );

  anchor.dispose();

  await waitFor(() => expect(getLifecycle()).toBe("disposed"));
  devtools.unmount();
});

test("the launcher's dot follows the session status", async () => {
  const { mock, anchor } = createAnchor({ answer: signedIn("ada_lovelace") });
  const first = mountDevtools({ anchor });

  expect(first.getLauncherDotState()).toBe("initializing");

  await anchor.start();

  await waitFor(() => expect(first.getLauncherDotState()).toBe("signed-in"));

  mock.push({
    ...signedIn("ada_lovelace"),
    status: "action-required",
    action: { kind: "setup-mfa" },
  });

  await waitFor(() =>
    expect(first.getLauncherDotState()).toBe("action-required"),
  );

  mock.push({ status: "signed-out" });

  await waitFor(() => expect(first.getLauncherDotState()).toBe("signed-out"));
  first.devtools.unmount();

  const failing = createAnchor({ hold: { read: true } });
  const second = mountDevtools({ anchor: failing.anchor });
  const started = failing.anchor.start();

  failing.mock.reads[0]?.fail(new Error("The provider is unreachable."));
  await started;

  await waitFor(() => expect(second.getLauncherDotState()).toBe("unavailable"));
  second.devtools.unmount();
});

test("the principal stays hidden until Show values is on, and the choice is remembered", async () => {
  const { anchor } = createAnchor({
    answer: signedIn("ada_lovelace", "tenant-west"),
  });

  const { devtools, host, getView, getPrincipal } = mountDevtools({
    anchor,
    initialIsOpen: true,
  });

  await anchor.start();

  await waitFor(() => expect(getPrincipal()).toBe("principal hidden"));

  const getValuesInMarkup = () =>
    ["login.example.com", "ada_lovelace", "tenant-west"].filter((value) =>
      host.shadowRoot?.innerHTML.includes(value),
    );

  const getCheckbox = () =>
    getView().getByRole("checkbox", { name: "Show values" });

  expect(getValuesInMarkup()).toEqual([]);
  expect(getCheckbox()).toHaveProperty("checked", false);

  fireEvent.click(getCheckbox());

  expect(getPrincipal()).toBe(
    `${AUTHORITY} · ada_lovelace · tenant tenant-west`,
  );
  expect(getValuesInMarkup()).toEqual([
    "login.example.com",
    "ada_lovelace",
    "tenant-west",
  ]);
  expect(localStorage.getItem(PREFERENCES_KEY)).toBe(
    JSON.stringify({ isOpen: true, showValues: true }),
  );

  devtools.unmount();
  devtools.mount(host);

  expect(getCheckbox()).toHaveProperty("checked", true);
  expect(getPrincipal()).toBe(
    `${AUTHORITY} · ada_lovelace · tenant tenant-west`,
  );

  fireEvent.click(getCheckbox());

  expect(getPrincipal()).toBe("principal hidden");
  expect(getValuesInMarkup()).toEqual([]);
  devtools.unmount();
});

test("the operations in flight list each read, token request and ending with its detail", async () => {
  const { mock, anchor } = createAnchor({
    answer: signedIn("ada_lovelace"),
    hold: true,
  });

  const { devtools, getView, getOperationLines } = mountDevtools({
    anchor,
    initialIsOpen: true,
  });

  const started = anchor.start();

  await waitFor(() =>
    expect(getOperationLines()).toEqual(["read · active · 0 waiters"]),
  );

  const synced = anchor.sync();

  await waitFor(() =>
    expect(getOperationLines()).toEqual([
      "read · active · 0 waiters",
      "read · queued · 1 waiter",
    ]),
  );

  mock.reads[0]?.settle();
  await started;

  await waitFor(() =>
    expect(getOperationLines()).toEqual(["read · active · 1 waiter"]),
  );

  mock.reads[1]?.settle();
  await synced;

  const session = getSignedInSession(anchor);
  const key = session.key.slice(0, 8);

  session.getToken("api").catch(() => {});
  session.getToken("api").catch(() => {});
  session.getToken("api", { forceRefresh: true }).catch(() => {});

  await waitFor(() =>
    expect(getOperationLines()).toEqual([
      `token · api · 2 waiters · key ${key}`,
      `token · api · forced refresh · 1 waiter · key ${key}`,
    ]),
  );

  const ended = session.end();

  await waitFor(() =>
    expect(getOperationLines()).toEqual([`end · key ${key}`]),
  );

  mock.ends[0]?.settle();
  await ended;

  await waitFor(() => expect(getOperationLines()).toEqual([]));
  expect(getView().getByText("None").tagName).toBe("P");
  devtools.unmount();
});

test("the timeline lists every diagnostic newest first, with its time, type, session key and context", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(Date.UTC(2026, 8, 20, 9, 5, 7, 42));

  const { anchor } = createAnchor({ answer: signedIn("ada_lovelace") });

  const { devtools, getRows, getRowCells } = mountDevtools({
    anchor,
    initialIsOpen: true,
  });

  await anchor.start();

  const session = getSignedInSession(anchor);
  const key = session.key.slice(0, 8);

  await session.getToken("api");
  await session.end();

  await waitFor(() =>
    expect(getRowCells()).toEqual([
      ["session signed out", key, ""],
      ["end completed", key, "local completed · remote not-applicable"],
      ["end started", key, ""],
      ["token received", key, "profile api · forceRefresh false"],
      ["token requested", key, "profile api · forceRefresh false"],
      ["session accepted", key, "status signed-in"],
      ["read completed", "", "status signed-in"],
      ["read started", "", ""],
      ["anchor started", "", ""],
    ]),
  );

  const [signedOut, , , , requested] = getRows();
  const time = requested?.querySelector("time");

  expect(time?.getAttribute("datetime")).toBe("2026-09-20T09:05:07.042Z");
  expect(time?.getAttribute("title")).toBe("2026-09-20T09:05:07.042Z");
  expect(
    requested?.querySelector(".event-session")?.getAttribute("title"),
  ).toBe(session.key);
  expect(requested?.querySelector("pre")?.textContent).toBe(
    JSON.stringify({ profile: "api", forceRefresh: false }, null, 2),
  );
  expect(signedOut?.querySelector("pre")?.textContent).toBe("null");
  devtools.unmount();
});

test("every group chip counts its rows, and one group at a time narrows them", async () => {
  const observers: SessionObserver<unknown>[] = [];

  const { anchor } = createAnchor({
    answer: signedIn("ada_lovelace"),
    onOpen: (observer) => {
      if (observers.length > 0) {
        return;
      }

      observers.push(observer);

      throw new Error("The provider is not ready.");
    },
  });

  const { devtools, getRowTypes, getGroupChips } = mountDevtools({
    anchor,
    initialIsOpen: true,
  });

  await anchor.start().catch(() => {});
  observers[0]?.invalidate();
  await anchor.start();

  const session = getSignedInSession(anchor);

  await session.getToken("api");
  await session.end();

  const getChipLabels = () =>
    getGroupChips()
      .getAllByRole("button")
      .map((chip) => chip.textContent);

  const getChipPressedStates = () =>
    getGroupChips()
      .getAllByRole("button")
      .map((chip) => chip.getAttribute("aria-pressed"));

  await waitFor(() =>
    expect(getChipLabels()).toEqual([
      "All 11",
      "Lifecycle 2",
      "Reads 2",
      "Session 2",
      "Tokens 2",
      "Ending 2",
      "Callbacks 1",
    ]),
  );
  expect(getChipPressedStates()).toEqual([
    "true",
    "false",
    "false",
    "false",
    "false",
    "false",
    "false",
  ]);

  fireEvent.click(getGroupChips().getByRole("button", { name: "Callbacks 1" }));

  expect(getRowTypes()).toEqual(["callback ignored"]);
  expect(getChipPressedStates()).toEqual([
    "false",
    "false",
    "false",
    "false",
    "false",
    "false",
    "true",
  ]);

  fireEvent.click(getGroupChips().getByRole("button", { name: "Lifecycle 2" }));

  expect(getRowTypes()).toEqual(["anchor started", "anchor start failed"]);

  fireEvent.click(getGroupChips().getByRole("button", { name: "Tokens 2" }));

  expect(getRowTypes()).toEqual(["token received", "token requested"]);

  fireEvent.click(getGroupChips().getByRole("button", { name: "Ending 2" }));

  expect(getRowTypes()).toEqual(["end completed", "end started"]);

  fireEvent.click(getGroupChips().getByRole("button", { name: "Session 2" }));

  expect(getRowTypes()).toEqual(["session signed out", "session accepted"]);

  fireEvent.click(getGroupChips().getByRole("button", { name: "All 11" }));

  expect(getRowTypes()).toEqual([
    "session signed out",
    "end completed",
    "end started",
    "token received",
    "token requested",
    "session accepted",
    "read completed",
    "read started",
    "anchor started",
    "callback ignored",
    "anchor start failed",
  ]);
  devtools.unmount();
});

test("the search matches the type, the session key and the context, and says how to clear what matches nothing", async () => {
  const { anchor } = createAnchor({ answer: signedIn("ada_lovelace") });

  const { devtools, getView, getPanel, getRowTypes } = mountDevtools({
    anchor,
    initialIsOpen: true,
  });

  await anchor.start();

  const session = getSignedInSession(anchor);

  await session.getToken("api", { forceRefresh: true });

  await waitFor(() => expect(getRowTypes()).toHaveLength(6));

  const getSearchBox = () =>
    getView().getByRole("searchbox", { name: "Filter events" });

  const getRowTypesMatching = (query: string) => {
    fireEvent.input(getSearchBox(), { target: { value: query } });

    return getRowTypes();
  };

  expect(getRowTypesMatching("TOKEN")).toEqual([
    "token received",
    "token requested",
  ]);
  expect(getRowTypesMatching("forceRefresh true")).toEqual([
    "token received",
    "token requested",
  ]);
  expect(getRowTypesMatching(session.key.slice(0, 8))).toEqual([
    "token received",
    "token requested",
    "session accepted",
  ]);
  expect(getRowTypesMatching('"status": "signed-in"')).toEqual([
    "session accepted",
    "read completed",
  ]);
  expect(getPanel().querySelector(".total")?.textContent).toBe("2 / 6");
  expect(getRowTypesMatching("nothing matches this")).toEqual([]);
  expect(getView().getByText("No matching events").tagName).toBe("STRONG");

  fireEvent.click(getView().getByRole("button", { name: "Clear filters" }));

  expect(getSearchBox()).toHaveProperty("value", "");
  expect(getRowTypes()).toEqual([
    "token received",
    "token requested",
    "session accepted",
    "read completed",
    "read started",
    "anchor started",
  ]);
  devtools.unmount();
});

test("pausing stops recording, resuming continues it, clearing forgets everything, and none of it touches the Anchor", async () => {
  const { mock, anchor } = createAnchor({ answer: signedIn("ada_lovelace") });
  const spy = spyOnAnchor(anchor);

  const { devtools, getView, getRowTypes, getSessionLine } = mountDevtools({
    anchor,
    initialIsOpen: true,
    maxEvents: 3,
  });

  await anchor.start();

  await waitFor(() =>
    expect(getRowTypes()).toEqual([
      "session accepted",
      "read completed",
      "read started",
    ]),
  );
  expect(
    getView()
      .getByRole("button", { name: "Pause" })
      .getAttribute("aria-pressed"),
  ).toBe("false");

  fireEvent.click(getView().getByRole("button", { name: "Pause" }));

  expect(
    getView()
      .getByRole("button", { name: "Resume" })
      .getAttribute("aria-pressed"),
  ).toBe("true");
  expect(spy.live).toEqual({ diagnostics: 1, "diagnostics.events": 0 });

  mock.push(signedIn("grace_hopper"));

  const { key } = getSignedInSession(anchor);

  // The header stays live while paused, so once it shows the new session the timeline has had its chance.
  await waitFor(() =>
    expect(getSessionLine()).toBe(
      `mocked · signed-in · generation #2 · key ${key}`,
    ),
  );
  expect(getRowTypes()).toEqual([
    "session accepted",
    "read completed",
    "read started",
  ]);

  fireEvent.click(getView().getByRole("button", { name: "Clear" }));

  await waitFor(() =>
    expect(getView().getByText("Recording paused").tagName).toBe("STRONG"),
  );

  fireEvent.input(getView().getByRole("searchbox", { name: "Filter events" }), {
    target: { value: "session" },
  });

  expect(getView().getByText("No matching events").tagName).toBe("STRONG");

  fireEvent.click(getView().getByRole("button", { name: "Clear filters" }));

  expect(getView().getByText("Recording paused").tagName).toBe("STRONG");

  fireEvent.click(getView().getByRole("button", { name: "Resume" }));

  expect(spy.live).toEqual({ diagnostics: 1, "diagnostics.events": 1 });

  await anchor.sync();

  await waitFor(() =>
    expect(getRowTypes()).toEqual(["read completed", "read started"]),
  );
  expect(mock.reads).toHaveLength(2);
  expect(mock.tokens).toEqual([]);
  expect(mock.ends).toEqual([]);

  devtools.setMaxEvents(1);

  await waitFor(() => expect(getRowTypes()).toEqual(["read completed"]));
  devtools.unmount();
});

test("an empty timeline says it is waiting", () => {
  const { anchor } = createAnchor();
  const { devtools, getView } = mountDevtools({ anchor, initialIsOpen: true });

  expect(getView().getByText("Waiting for events").tagName).toBe("STRONG");
  devtools.unmount();
});

test("the launcher opens the panel, the panel resizes within its bounds and docks, Escape closes it, and the state is remembered", () => {
  const { anchor } = createAnchor();
  const first = mountDevtools({ anchor });

  expect(
    first.getView().queryByRole("complementary", { name: "Anchor devtools" }),
  ).toBeNull();

  fireEvent.click(
    first.getView().getByRole("button", { name: "Open Anchor devtools" }),
  );

  const panel = first.getPanel();

  expect(first.host.shadowRoot?.activeElement).toBe(panel);

  const getHandle = () =>
    first.getView().getByRole("separator", { name: "Resize devtools" });

  const pressKey = (key: string, times: number) => {
    for (let index = 0; index < times; index += 1) {
      fireEvent.keyDown(getHandle(), { key });
    }
  };

  expect(getHandle().getAttribute("aria-orientation")).toBe("horizontal");
  expect(getHandle().getAttribute("aria-valuenow")).toBe("420");

  pressKey("ArrowUp", 1);
  expect(panel.style.height).toBe("444px");
  pressKey("ArrowDown", 1);
  expect(panel.style.height).toBe("420px");
  pressKey("Enter", 1);
  expect(panel.style.height).toBe("420px");
  pressKey("ArrowDown", 8);
  expect(panel.style.height).toBe("240px");
  pressKey("ArrowUp", 30);
  expect(panel.style.height).toBe("744px");

  fireEvent.click(
    first.getView().getByRole("button", { name: "Dock to the right" }),
  );

  expect(panel.dataset.position).toBe("right");
  expect(panel.style.width).toBe("520px");
  expect(getHandle().getAttribute("aria-orientation")).toBe("vertical");

  pressKey("ArrowLeft", 1);
  expect(panel.style.width).toBe("544px");
  pressKey("ArrowRight", 2);
  expect(panel.style.width).toBe("496px");

  fireEvent.click(
    first.getView().getByRole("button", { name: "Dock to the bottom" }),
  );

  expect(panel.style.height).toBe("744px");

  fireEvent.keyDown(panel, { key: "Enter" });

  expect(first.getPanel()).toBe(panel);

  fireEvent.keyDown(panel, { key: "Escape" });

  expect(first.host.shadowRoot?.activeElement).toBe(
    first.getView().getByRole("button", { name: "Open Anchor devtools" }),
  );
  expect(localStorage.getItem(PREFERENCES_KEY)).toBe(
    JSON.stringify({
      isOpen: false,
      height: 744,
      position: "bottom",
      width: 496,
    }),
  );
  first.devtools.unmount();

  const second = mountDevtools({ anchor, initialIsOpen: true });

  expect(
    second.getView().getByRole("button", { name: "Open Anchor devtools" })
      .tagName,
  ).toBe("BUTTON");
  expect(second.host.shadowRoot?.activeElement).toBeNull();
  second.devtools.unmount();
});

test("the resize handle follows a drag away from its edge until it is released", () => {
  const { anchor } = createAnchor();

  const { devtools, getView, getPanel } = mountDevtools({
    anchor,
    initialIsOpen: true,
  });

  const getHandle = () =>
    getView().getByRole("separator", { name: "Resize devtools" });

  const captured: number[] = [];

  getHandle().setPointerCapture = (pointerId) => {
    captured.push(pointerId);
  };

  fireEvent.pointerDown(getHandle(), {
    pointerId: 7,
    clientX: 900,
    clientY: 500,
  });
  fireEvent.pointerMove(getHandle(), { clientX: 900, clientY: 450 });

  expect(getPanel().style.height).toBe("470px");

  fireEvent.pointerUp(getHandle());
  fireEvent.pointerMove(getHandle(), { clientX: 900, clientY: 300 });

  expect(getPanel().style.height).toBe("470px");

  fireEvent.click(getView().getByRole("button", { name: "Dock to the right" }));

  getHandle().setPointerCapture = (pointerId) => {
    captured.push(pointerId);
  };

  fireEvent.pointerDown(getHandle(), {
    pointerId: 8,
    clientX: 900,
    clientY: 500,
  });
  fireEvent.pointerMove(getHandle(), { clientX: 860, clientY: 500 });

  expect(getPanel().style.width).toBe("560px");
  expect(captured).toEqual([7, 8]);
  devtools.unmount();
});

test("an element that cannot host a shadow root is refused with INVALID_CONFIGURATION, never a DOMException", () => {
  const { anchor } = createAnchor();
  const devtools = new AnchorDevtools({ anchor });

  expect(() => devtools.mount(document.createElement("input"))).toThrow(
    expect.objectContaining({
      name: "AnchorError",
      code: "INVALID_CONFIGURATION",
      message:
        "Anchor devtools need an element that can host an open shadow root, such as a div.",
    }),
  );
});

test("setAnchor follows another Anchor, history survives a remount, and mounting twice throws", async () => {
  const original = createAnchor({ answer: signedIn("ada_lovelace") });
  const replacement = createAnchor({ name: "replacement" });
  const originalSpy = spyOnAnchor(original.anchor);
  const replacementSpy = spyOnAnchor(replacement.anchor);

  const { devtools, host, getLifecycle, getSessionLine, getRowTypes } =
    mountDevtools({ anchor: original.anchor, initialIsOpen: true });

  await original.anchor.start();

  await waitFor(() =>
    expect(getRowTypes()).toEqual([
      "session accepted",
      "read completed",
      "read started",
      "anchor started",
    ]),
  );
  expect(() => devtools.mount(host)).toThrow(
    expect.objectContaining({
      name: "AnchorError",
      code: "INVALID_CONFIGURATION",
      message: "Anchor devtools are already mounted. Call unmount() first.",
    }),
  );

  devtools.setAnchor(replacement.anchor);

  expect(original.anchor.diagnostics.get().state).toBe("started");
  expect(getLifecycle()).toBe("idle");
  expect(getSessionLine()).toBe("replacement · initializing · generation #0");
  expect(originalSpy.live).toEqual({
    diagnostics: 0,
    "diagnostics.events": 0,
  });
  expect(replacementSpy.live).toEqual({
    diagnostics: 1,
    "diagnostics.events": 1,
  });

  await original.anchor.sync();
  await replacement.anchor.start();

  const recorded = [
    "session signed out",
    "read completed",
    "read started",
    "anchor started",
    "session accepted",
    "read completed",
    "read started",
    "anchor started",
  ];

  await waitFor(() => expect(getRowTypes()).toEqual(recorded));

  devtools.unmount();
  devtools.unmount();

  expect(host.shadowRoot?.childElementCount).toBe(0);

  devtools.mount(host);

  expect(getRowTypes()).toEqual(recorded);
  devtools.unmount();
});

test("constructing observes nothing, and unmounting stops observing, so nothing is recorded or leaked afterwards", () => {
  const { anchor } = createAnchor();
  const spy = spyOnAnchor(anchor);
  const devtools = new AnchorDevtools({ anchor });

  expect(spy.live).toEqual({ diagnostics: 0, "diagnostics.events": 0 });

  devtools.mount(document.body.appendChild(document.createElement("div")));

  expect(spy.live).toEqual({ diagnostics: 1, "diagnostics.events": 1 });

  devtools.unmount();

  expect(spy.live).toEqual({ diagnostics: 0, "diagnostics.events": 0 });
});

test("an Anchor disposed while the inspector is mounted shows it, and unmounting afterwards releases everything", async () => {
  const { anchor } = createAnchor({ answer: signedIn("ada_lovelace") });
  const spy = spyOnAnchor(anchor);

  const { devtools, getLifecycle, getSessionLine, getRowTypes } = mountDevtools(
    { anchor, initialIsOpen: true },
  );

  await anchor.start();

  const { key } = getSignedInSession(anchor);

  anchor.dispose();

  await waitFor(() =>
    expect(getRowTypes()).toEqual([
      "anchor disposed",
      "session accepted",
      "read completed",
      "read started",
      "anchor started",
    ]),
  );
  expect(getLifecycle()).toBe("disposed");
  expect(getSessionLine()).toBe(
    `mocked · signed-in · generation #1 · key ${key}`,
  );

  devtools.unmount();

  expect(spy.live).toEqual({ diagnostics: 0, "diagnostics.events": 0 });
});

test("no token, cookie or provider error appears anywhere in the panel, even with values shown", async () => {
  const answer = {
    ...signedIn("ada_lovelace"),
    user: { name: "Ada", cookie: "sid=COOKIE-VALUE" },
  };

  const { mock, anchor } = createAnchor({
    answer,
    hold: { read: true, getToken: true, end: true },
  });

  const { devtools, host, getView, getRowTypes, getPrincipal } = mountDevtools({
    anchor,
    initialIsOpen: true,
  });

  fireEvent.click(getView().getByRole("checkbox", { name: "Show values" }));

  const started = anchor.start();

  mock.reads[0]?.fail(new Error("READ-PROVIDER-ERROR"));
  await started;
  mock.push(answer);

  const session = getSignedInSession(anchor);
  const minted = session.getToken("api");

  mock.tokens[0]?.settle();

  expect(await minted).toEqual({
    value: "api:ada_lovelace:1",
    kind: "access-token",
    scheme: "Bearer",
  });

  const refused = session.getToken("api", { forceRefresh: true });

  mock.tokens[1]?.fail(new Error("TOKEN-PROVIDER-ERROR"));
  await expect(refused).rejects.toMatchObject({ code: "TOKEN_FAILED" });

  const ended = session.end();

  mock.ends[0]?.fail(new Error("END-PROVIDER-ERROR"));
  await expect(ended).rejects.toMatchObject({ code: "END_FAILED" });

  // A failed end makes Anchor read the provider again, and that read is held.
  await waitFor(() =>
    expect(getRowTypes()).toEqual([
      "read started",
      "end failed",
      "end started",
      "token failed",
      "token requested",
      "token received",
      "token requested",
      "session accepted",
      "session unavailable",
      "read failed",
      "read started",
      "anchor started",
    ]),
  );

  const markup = host.shadowRoot?.innerHTML ?? "";

  expect(getPrincipal()).toBe(`${AUTHORITY} · ada_lovelace`);
  expect(
    ["READ_FAILED", "TOKEN_FAILED", "END_FAILED"].filter((code) =>
      markup.includes(code),
    ),
  ).toEqual(["READ_FAILED", "TOKEN_FAILED", "END_FAILED"]);
  expect(
    [
      "api:ada_lovelace:1",
      "COOKIE-VALUE",
      "READ-PROVIDER-ERROR",
      "TOKEN-PROVIDER-ERROR",
      "END-PROVIDER-ERROR",
    ].filter(
      (secret) =>
        markup.includes(secret) ||
        (localStorage.getItem(PREFERENCES_KEY) ?? "").includes(secret),
    ),
  ).toEqual([]);
  devtools.unmount();
});

test("observing creates no provider demand: mounting, opening, filtering, pausing and unmounting read, mint and end nothing", async () => {
  const { mock, anchor } = createAnchor({ answer: signedIn("ada_lovelace") });

  await anchor.start();

  const reads = [...mock.reads];

  const { devtools, getView, getPanel, getGroupChips } = mountDevtools({
    anchor,
  });

  fireEvent.click(
    getView().getByRole("button", { name: "Open Anchor devtools" }),
  );
  fireEvent.input(getView().getByRole("searchbox", { name: "Filter events" }), {
    target: { value: "token" },
  });
  fireEvent.click(getGroupChips().getByRole("button", { name: /^Tokens/ }));
  fireEvent.click(getView().getByRole("checkbox", { name: "Show values" }));
  fireEvent.click(getView().getByRole("button", { name: "Pause" }));
  fireEvent.click(getView().getByRole("button", { name: "Resume" }));
  fireEvent.click(getView().getByRole("button", { name: "Clear" }));
  fireEvent.click(getView().getByRole("button", { name: "Dock to the right" }));
  fireEvent.keyDown(getPanel(), { key: "Escape" });
  devtools.unmount();

  expect(mock.reads).toEqual(reads);
  expect(mock.tokens).toEqual([]);
  expect(mock.ends).toEqual([]);
  expect(mock.sessions.map(({ disposeCount }) => disposeCount)).toEqual([0]);
  expect(anchor.diagnostics.get().state).toBe("started");
});

test("a row's context is copied as shown, with brief feedback that unmounting clears", async () => {
  const writeText = vi.fn((text: string) => Promise.resolve(text));

  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });

  const { anchor } = createAnchor();

  const { devtools, getRows, getRowTypes } = mountDevtools({
    anchor,
    initialIsOpen: true,
  });

  await anchor.start();

  await waitFor(() =>
    expect(getRowTypes()).toEqual([
      "session signed out",
      "read completed",
      "read started",
      "anchor started",
    ]),
  );

  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

  const getCopyButton = () =>
    within(getRows()[1] ?? document.body).getByRole("button");

  fireEvent.click(getCopyButton());
  await Promise.resolve();

  expect(writeText.mock.calls).toEqual([
    [JSON.stringify({ status: "signed-out" }, null, 2)],
  ]);
  expect(getCopyButton().textContent).toBe("Copied");

  vi.advanceTimersByTime(1_199);
  expect(getCopyButton().textContent).toBe("Copied");
  vi.advanceTimersByTime(1);
  expect(getCopyButton().textContent).toBe("Copy");

  fireEvent.click(getCopyButton());
  await Promise.resolve();

  expect(vi.getTimerCount()).toBe(1);

  devtools.unmount();

  expect(vi.getTimerCount()).toBe(0);
});

test("copying without a clipboard, or with one that refuses, changes nothing", async () => {
  const { anchor } = createAnchor();

  const { devtools, getRows, getRowTypes } = mountDevtools({
    anchor,
    initialIsOpen: true,
  });

  await anchor.start();

  await waitFor(() => expect(getRowTypes()[0]).toBe("session signed out"));

  const getCopyButton = () =>
    within(getRows()[0] ?? document.body).getByRole("button");

  const reported: unknown[] = [];

  const handleError = (event: ErrorEvent) => {
    reported.push(event.error);
  };

  window.addEventListener("error", handleError);
  fireEvent.click(getCopyButton());
  window.removeEventListener("error", handleError);

  expect(reported).toEqual([]);
  expect(getCopyButton().textContent).toBe("Copy");

  const writeText = vi.fn(() => Promise.reject(new Error("denied")));

  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
  fireEvent.click(getCopyButton());
  await Promise.allSettled(writeText.mock.results.map(({ value }) => value));

  expect(writeText.mock.calls).toEqual([["null"]]);
  expect(getCopyButton().textContent).toBe("Copy");
  devtools.unmount();
});

test("names are shown as text, never parsed as markup", async () => {
  const { anchor } = createAnchor({
    name: "<img src=x onerror=alert(1)>",
    answer: signedIn("<u>ada</u>"),
    tokens: { "<b>api</b>": {} },
    hold: { getToken: true },
  });

  const {
    devtools,
    host,
    getView,
    getRowCells,
    getSessionLine,
    getPrincipal,
    getOperationLines,
  } = mountDevtools({ anchor, initialIsOpen: true });

  await anchor.start();

  const session = getSignedInSession(anchor);
  const key = session.key.slice(0, 8);

  session.getToken("<b>api</b>").catch(() => {});
  fireEvent.click(getView().getByRole("checkbox", { name: "Show values" }));

  await waitFor(() =>
    expect(getOperationLines()).toEqual([
      `token · <b>api</b> · 1 waiter · key ${key}`,
    ]),
  );
  await waitFor(() =>
    expect(getRowCells()[0]).toEqual([
      "token requested",
      key,
      "profile <b>api</b> · forceRefresh false",
    ]),
  );
  expect(host.shadowRoot?.querySelector("img, b, u")).toBeNull();
  expect(getSessionLine()).toBe(
    `<img src=x onerror=alert(1)> · signed-in · generation #1 · key ${session.key}`,
  );
  expect(getPrincipal()).toBe(`${AUTHORITY} · <u>ada</u>`);
  devtools.unmount();
});

test("a clock outside the calendar leaves the time blank instead of breaking the timeline", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(1e20);

  const { anchor } = createAnchor();

  const { devtools, getRows, getRowTypes } = mountDevtools({
    anchor,
    initialIsOpen: true,
  });

  await anchor.start();

  await waitFor(() =>
    expect(getRowTypes()).toEqual([
      "session signed out",
      "read completed",
      "read started",
      "anchor started",
    ]),
  );
  expect(
    getRows().map((row) => row.querySelector("time")?.textContent),
  ).toEqual(["", "", "", ""]);
  devtools.unmount();
});
