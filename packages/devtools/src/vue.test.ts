import { AnchorProvider } from "@priemskiyyy/anchor-vue";
import type { RegisteredAnchor } from "@priemskiyyy/anchor-vue";
import { fireEvent, waitFor, within } from "@testing-library/dom";
import { mount } from "@vue/test-utils";
import { afterEach, expect, test } from "vitest";
import { defineComponent, h, nextTick, shallowRef } from "vue";
import type { ShallowRef } from "vue";

import { createAnchor } from "src/createAnchor.fixture";
import { spyOnAnchor } from "src/spyOnAnchor.fixture";
import type { AnchorDevtoolsProps } from "src/types/AnchorDevtoolsProps";
import { AnchorDevtools } from "src/vue";

afterEach(() => {
  localStorage.clear();
});

const createApplication = (
  anchor: ShallowRef<RegisteredAnchor>,
  props: ShallowRef<AnchorDevtoolsProps>,
) =>
  defineComponent(
    () => () =>
      h(
        AnchorProvider,
        { anchor: anchor.value },
        { default: () => h(AnchorDevtools, props.value) },
      ),
  );

const getInspectorRoot = (host: Element) => {
  const root = host.shadowRoot?.firstElementChild;

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

test("the Vue wrapper mounts the inspector for the provider's Anchor, follows a new event limit, and removes it on unmount", async () => {
  const { mock, anchor } = createAnchor();
  const spy = spyOnAnchor(anchor);
  const props = shallowRef<AnchorDevtoolsProps>({ initialIsOpen: true });
  const wrapper = mount(createApplication(shallowRef(anchor), props));

  await nextTick();

  const host = wrapper.find("[data-anchor-devtools]").element;
  const root = getInspectorRoot(host);

  expect(
    within(root).getByRole("complementary", { name: "Anchor devtools" })
      .tagName,
  ).toBe("ASIDE");
  expect(spy.live).toEqual({ diagnostics: 1, "diagnostics.events": 1 });

  props.value = { initialIsOpen: true, maxEvents: 1 };
  await nextTick();
  await anchor.start();

  await waitFor(() =>
    expect(getRowTypes(root)).toEqual(["session signed out"]),
  );

  wrapper.unmount();

  expect(spy.live).toEqual({ diagnostics: 0, "diagnostics.events": 0 });
  expect(host.shadowRoot?.childElementCount).toBe(0);
  expect(mock.tokens).toEqual([]);
  expect(mock.ends).toEqual([]);
});

test("the Vue wrapper inspects the Anchor its provider held when it was set up, as useAnchor returns it", async () => {
  const first = createAnchor();
  const second = createAnchor();
  const firstSpy = spyOnAnchor(first.anchor);
  const secondSpy = spyOnAnchor(second.anchor);
  const anchor = shallowRef<RegisteredAnchor>(first.anchor);

  const wrapper = mount(
    createApplication(anchor, shallowRef({ initialIsOpen: true })),
  );

  await nextTick();

  anchor.value = second.anchor;
  await nextTick();

  expect(firstSpy.live).toEqual({ diagnostics: 1, "diagnostics.events": 1 });
  expect(secondSpy.live).toEqual({ diagnostics: 0, "diagnostics.events": 0 });

  wrapper.unmount();

  expect(firstSpy.live).toEqual({ diagnostics: 0, "diagnostics.events": 0 });
});

test("without props the inspector starts closed and keeps more than one event", async () => {
  const { anchor } = createAnchor();
  const wrapper = mount(createApplication(shallowRef(anchor), shallowRef({})));

  await nextTick();

  const root = getInspectorRoot(wrapper.find("[data-anchor-devtools]").element);

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
  wrapper.unmount();
});
