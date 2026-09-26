import { AnchorProvider } from "@priemskiyyy/anchor-react";
import type { RegisteredAnchor } from "@priemskiyyy/anchor-react";
import { fireEvent, waitFor, within } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import { StrictMode, createElement } from "react";
import { afterEach, expect, test } from "vitest";

import { createAnchor, signedIn } from "src/createAnchor.fixture";
import { AnchorDevtools } from "src/react";
import { spyOnAnchor } from "src/spyOnAnchor.fixture";
import type { AnchorDevtoolsProps } from "src/types/AnchorDevtoolsProps";

afterEach(() => {
  cleanup();
  localStorage.clear();
});

const createTree = (
  anchor: RegisteredAnchor,
  props: AnchorDevtoolsProps = { initialIsOpen: true },
) =>
  createElement(
    StrictMode,
    null,
    createElement(
      AnchorProvider,
      { anchor },
      createElement(AnchorDevtools, props),
    ),
  );

const getInspector = (container: HTMLElement) => {
  const root = container.querySelector("[data-anchor-devtools]")?.shadowRoot
    ?.firstElementChild;

  if (!(root instanceof HTMLElement)) {
    throw new Error("Expected the devtools root inside the shadow root");
  }

  return within(root);
};

const getRowTypes = (container: HTMLElement) =>
  Array.from(
    getInspector(container)
      .queryByLabelText("Event timeline")
      ?.querySelectorAll(".event-type") ?? [],
    (type) => type.textContent,
  );

test("Strict Mode mounts one inspector, and unmounting leaves no listener behind", () => {
  const { mock, anchor } = createAnchor();
  const spy = spyOnAnchor(anchor);
  const view = render(createTree(anchor));

  expect(
    view.container.querySelectorAll("[data-anchor-devtools]"),
  ).toHaveLength(1);
  expect(
    getInspector(view.container).getByRole("complementary", {
      name: "Anchor devtools",
    }).tagName,
  ).toBe("ASIDE");
  expect(spy.live).toEqual({ diagnostics: 1, "diagnostics.events": 1 });

  view.unmount();

  expect(spy.live).toEqual({ diagnostics: 0, "diagnostics.events": 0 });
  expect(mock.sessions).toEqual([]);
  expect(mock.reads).toEqual([]);
  expect(mock.tokens).toEqual([]);
  expect(mock.ends).toEqual([]);
});

test("a rerender keeps the mounted inspector, follows a replaced Anchor and a new event limit", async () => {
  const first = createAnchor({ answer: signedIn("ada_lovelace") });
  const second = createAnchor();
  const firstSpy = spyOnAnchor(first.anchor);
  const secondSpy = spyOnAnchor(second.anchor);
  const view = render(createTree(first.anchor));

  const getSearchBox = () =>
    getInspector(view.container).getByRole("searchbox", {
      name: "Filter events",
    });

  fireEvent.input(getSearchBox(), { target: { value: "started" } });
  await first.anchor.start();

  await waitFor(() =>
    expect(getRowTypes(view.container)).toEqual([
      "read started",
      "anchor started",
    ]),
  );

  view.rerender(
    createTree(second.anchor, { initialIsOpen: true, maxEvents: 1 }),
  );
  await second.anchor.start();

  expect(getSearchBox()).toHaveProperty("value", "started");
  expect(firstSpy.live).toEqual({ diagnostics: 0, "diagnostics.events": 0 });
  expect(secondSpy.live).toEqual({ diagnostics: 1, "diagnostics.events": 1 });

  fireEvent.input(getSearchBox(), { target: { value: "" } });

  await waitFor(() =>
    expect(getRowTypes(view.container)).toEqual(["session signed out"]),
  );
  view.unmount();
});

test("without props the inspector starts closed and keeps more than one event", async () => {
  const { anchor } = createAnchor();
  const view = render(createTree(anchor, {}));

  fireEvent.click(
    getInspector(view.container).getByRole("button", {
      name: "Open Anchor devtools",
    }),
  );
  await anchor.start();

  await waitFor(() =>
    expect(getRowTypes(view.container)).toEqual([
      "session signed out",
      "read completed",
      "read started",
      "anchor started",
    ]),
  );
  view.unmount();
});
