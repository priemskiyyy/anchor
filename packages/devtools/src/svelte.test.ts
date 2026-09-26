import { fireEvent, waitFor, within } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/svelte";
import { tick } from "svelte";
import { afterEach, expect, test } from "vitest";

import { createAnchor } from "src/createAnchor.fixture";
import { spyOnAnchor } from "src/spyOnAnchor.fixture";
import Fixture from "src/svelte.fixture.svelte";

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

test("the Svelte attachment mounts the inspector for the provider's Anchor with its options, and removes it on unmount", async () => {
  const { mock, anchor } = createAnchor();
  const spy = spyOnAnchor(anchor);

  const view = render(Fixture, {
    props: { anchor, options: { initialIsOpen: true, maxEvents: 1 } },
  });

  await tick();

  const host = view.container.querySelector("div div");
  const root = getInspectorRoot(host);

  expect(
    within(root).getByRole("complementary", { name: "Anchor devtools" })
      .tagName,
  ).toBe("ASIDE");
  expect(spy.live).toEqual({ diagnostics: 1, "diagnostics.events": 1 });

  await anchor.start();

  await waitFor(() =>
    expect(getRowTypes(root)).toEqual(["session signed out"]),
  );

  view.unmount();

  expect(spy.live).toEqual({ diagnostics: 0, "diagnostics.events": 0 });
  expect(host?.shadowRoot?.childElementCount).toBe(0);
  expect(mock.tokens).toEqual([]);
  expect(mock.ends).toEqual([]);
});

test("the Svelte attachment inspects the Anchor its provider held when the component was created, as useAnchor returns it", async () => {
  const first = createAnchor();
  const second = createAnchor();
  const firstSpy = spyOnAnchor(first.anchor);
  const secondSpy = spyOnAnchor(second.anchor);

  const view = render(Fixture, {
    props: { anchor: first.anchor, options: { initialIsOpen: true } },
  });

  await tick();
  await view.rerender({ anchor: second.anchor });
  await tick();

  expect(firstSpy.live).toEqual({ diagnostics: 1, "diagnostics.events": 1 });
  expect(secondSpy.live).toEqual({ diagnostics: 0, "diagnostics.events": 0 });

  view.unmount();

  expect(firstSpy.live).toEqual({ diagnostics: 0, "diagnostics.events": 0 });
});

test("without options the inspector starts closed and keeps more than one event", async () => {
  const { anchor } = createAnchor();
  const view = render(Fixture, { props: { anchor } });

  await tick();

  const root = getInspectorRoot(view.container.querySelector("div div"));

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
  view.unmount();
});
