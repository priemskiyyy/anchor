import { AnchorProvider } from "@priemskiyyy/anchor-solid";
import type { RegisteredAnchor } from "@priemskiyyy/anchor-solid";
import { fireEvent, waitFor, within } from "@testing-library/dom";
import { cleanup, render } from "@solidjs/testing-library";
import { createComponent, createSignal } from "solid-js";
import { afterEach, expect, test } from "vitest";

import { createAnchor, signedIn } from "src/createAnchor.fixture";
import { AnchorDevtools } from "src/solid";
import { spyOnAnchor } from "src/spyOnAnchor.fixture";

afterEach(() => {
  cleanup();
  localStorage.clear();
});

const getInspectorRoot = (host: Element | null) => {
  const root = host?.shadowRoot?.firstElementChild;

  if (!(root instanceof HTMLElement)) {
    throw new Error("Expected the devtools root inside the shadow root");
  }

  return root;
};

const getRowTypes = (root: HTMLElement) =>
  Array.from(
    within(root)
      .queryByLabelText("Event timeline")
      ?.querySelectorAll(".event-type") ?? [],
    (type) => type.textContent,
  );

test("the Solid wrapper mounts the inspector for the provider's Anchor, follows another and a new event limit, and removes it on cleanup", async () => {
  const first = createAnchor();
  const second = createAnchor({ answer: signedIn("grace_hopper") });
  const firstSpy = spyOnAnchor(first.anchor);
  const secondSpy = spyOnAnchor(second.anchor);
  const [anchor, setAnchor] = createSignal<RegisteredAnchor>(first.anchor);
  const [maxEvents, setMaxEvents] = createSignal(10);

  const { container, unmount } = render(() =>
    createComponent(AnchorProvider, {
      get anchor() {
        return anchor();
      },
      get children() {
        return createComponent(AnchorDevtools, {
          initialIsOpen: true,
          get maxEvents() {
            return maxEvents();
          },
        });
      },
    }),
  );

  const host = container.querySelector("[data-anchor-devtools]");
  const root = getInspectorRoot(host);

  expect(
    within(root).getByRole("complementary", { name: "Anchor devtools" })
      .tagName,
  ).toBe("ASIDE");
  expect(firstSpy.live).toEqual({ diagnostics: 1, "diagnostics.events": 1 });

  setAnchor(() => second.anchor);
  setMaxEvents(1);
  await second.anchor.start();

  expect(firstSpy.live).toEqual({ diagnostics: 0, "diagnostics.events": 0 });
  expect(secondSpy.live).toEqual({ diagnostics: 1, "diagnostics.events": 1 });

  await waitFor(() => expect(getRowTypes(root)).toEqual(["session accepted"]));

  unmount();

  expect(secondSpy.live).toEqual({ diagnostics: 0, "diagnostics.events": 0 });
  expect(host?.shadowRoot?.childElementCount).toBe(0);
  expect(first.mock.sessions).toEqual([]);
  expect(second.mock.tokens).toEqual([]);
});

test("without props the inspector starts closed and keeps more than one event", async () => {
  const { anchor } = createAnchor();

  const { container, unmount } = render(() =>
    createComponent(AnchorProvider, {
      anchor,
      get children() {
        return createComponent(AnchorDevtools, {});
      },
    }),
  );

  const root = getInspectorRoot(
    container.querySelector("[data-anchor-devtools]"),
  );

  fireEvent.click(
    within(root).getByRole("button", { name: "Open Anchor devtools" }),
  );
  await anchor.start();

  await waitFor(() =>
    expect(getRowTypes(root)).toEqual([
      "session signed out",
      "read completed",
      "read started",
      "anchor started",
    ]),
  );
  unmount();
});
