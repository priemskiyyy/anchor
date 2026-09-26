import { mount } from "@vue/test-utils";
import { afterEach, expect, test, vi } from "vitest";
import { defineComponent, h, nextTick, shallowRef } from "vue";
import type { Component } from "vue";

import { createAnchor, signedIn } from "src/composables/anchor.fixture";
import { useAnchor } from "src/composables/useAnchor";
import { useSession } from "src/composables/useSession";
import { AnchorProvider } from "src/context/AnchorProvider";
import type {
  RegisteredAnchor,
  RegisteredSessionState,
} from "src/types/Register";

const views = new Set<{ unmount: () => void }>();

afterEach(() => {
  for (const view of views) {
    view.unmount();
  }

  views.clear();
});

const mountInProvider = (anchor: RegisteredAnchor, child: Component) => {
  const current = shallowRef(anchor);

  const view = mount(
    defineComponent(
      () => () => h(AnchorProvider, { anchor: current.value }, () => h(child)),
    ),
  );

  views.add(view);

  return { view, current };
};

const unmountView = (view: { unmount: () => void }) => {
  views.delete(view);
  view.unmount();
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

const Status = defineComponent(() => {
  const state = useSession();

  return () => h("p", state.value.status);
});

test.each<[string, () => unknown]>([
  ["useAnchor", () => useAnchor()],
  ["useSession", () => useSession()],
  ["useSession with a selector", () => useSession(selectStatus)],
])(
  "%s outside a provider throws an AnchorError that names the provider",
  (_, useComposable) => {
    vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(() =>
      mount(
        defineComponent(() => {
          useComposable();

          return () => null;
        }),
      ),
    ).toThrow(
      expect.objectContaining({
        name: "AnchorError",
        code: "INVALID_CONFIGURATION",
        message: "Anchor composables must be used within an AnchorProvider.",
      }),
    );
  },
);

test("useAnchor returns the nearest provider's Anchor", () => {
  const outer = createAnchor();
  const inner = createAnchor();
  const anchors: RegisteredAnchor[] = [];

  const AnchorCollector = defineComponent(() => {
    anchors.push(useAnchor());

    return () => null;
  });

  const view = mount(
    defineComponent(
      () => () =>
        h(AnchorProvider, { anchor: outer.anchor }, () =>
          h(AnchorProvider, { anchor: inner.anchor }, () => h(AnchorCollector)),
        ),
    ),
  );

  views.add(view);

  expect(anchors).toHaveLength(1);
  expect(anchors[0]).toBe(inner.anchor);
});

test("useSession follows the state through the first resolution and every change", async () => {
  const { mock, anchor } = createAnchor({ answer: signedIn("ada") });

  const StatusAndName = defineComponent(() => {
    const state = useSession();

    return () =>
      h(
        "p",
        state.value.status === "signed-in"
          ? `${state.value.status}:${getName(state.value)}`
          : state.value.status,
      );
  });

  const { view } = mountInProvider(anchor, StatusAndName);

  expect(view.text()).toBe("initializing");

  await anchor.start();
  await nextTick();

  expect(view.text()).toBe("signed-in:ada");

  mock.push({ status: "signed-out" });
  await nextTick();

  expect(view.text()).toBe("signed-out");
});

test("a selector renders again only when its selection changes", async () => {
  const { mock, anchor } = createAnchor({ answer: signedIn("ada") });
  const renders = vi.fn();

  const SelectedStatus = defineComponent(() => {
    const status = useSession(selectStatus);

    return () => {
      renders(status.value);

      return h("p", status.value);
    };
  });

  mountInProvider(anchor, SelectedStatus);
  await anchor.start();
  await nextTick();
  mock.push(signedIn("ada", "Ada Lovelace"));
  await nextTick();
  mock.push(signedIn("ada", "Countess of Lovelace"));
  await nextTick();

  expect(renders.mock.calls).toEqual([["initializing"], ["signed-in"]]);

  mock.push({ status: "signed-out" });
  await nextTick();

  expect(renders.mock.calls).toEqual([
    ["initializing"],
    ["signed-in"],
    ["signed-out"],
  ]);
});

test("an inline selector that builds a new object each call renders once per change and warns nothing", async () => {
  const { mock, anchor } = createAnchor({ answer: signedIn("ada") });
  const warn = vi.spyOn(console, "warn");
  const renders = vi.fn();

  const Profile = defineComponent(() => {
    const profile = useSession((state) => ({
      status: state.status,
      name: getName(state),
    }));

    return () => {
      renders(profile.value);

      return h("p", `${profile.value.status}:${profile.value.name}`);
    };
  });

  const { view } = mountInProvider(anchor, Profile);

  await anchor.start();
  await nextTick();
  mock.push(signedIn("ada", "Ada Lovelace"));
  await nextTick();

  expect(view.text()).toBe("signed-in:Ada Lovelace");
  expect(renders.mock.calls.map(([profile]) => profile)).toEqual([
    { status: "initializing", name: null },
    { status: "signed-in", name: "ada" },
    { status: "signed-in", name: "Ada Lovelace" },
  ]);
  expect(warn.mock.calls).toEqual([]);
});

test("mounting the provider and every composable starts, reads and mints nothing, and unmounting disposes nothing and leaves no listener", () => {
  const { mock, anchor, live } = createAnchor({ answer: signedIn("ada") });

  const Probe = defineComponent(() => {
    useAnchor();
    useSession();
    useSession(selectStatus);

    return () => null;
  });

  const { view } = mountInProvider(anchor, Probe);

  expect(live.subscriptions).toBe(2);

  unmountView(view);

  expect(live.subscriptions).toBe(0);
  expect(mock.sessions).toEqual([]);
  expect(mock.reads).toEqual([]);
  expect(mock.tokens).toEqual([]);
  expect(anchor.diagnostics.get().state).toBe("idle");
});

test("a remount starts and disposes nothing, and the unmount leaves no listener", async () => {
  const { mock, anchor, live } = createAnchor({ answer: signedIn("ada") });

  await anchor.start();
  unmountView(mountInProvider(anchor, Status).view);

  const { view } = mountInProvider(anchor, Status);

  await nextTick();

  expect(view.text()).toBe("signed-in");
  expect(live.subscriptions).toBe(1);

  unmountView(view);

  expect(live.subscriptions).toBe(0);
  expect(mock.sessions.map(({ disposeCount }) => disposeCount)).toEqual([0]);
  expect(anchor.diagnostics.get().state).toBe("started");
});

test("a replaced Anchor moves the composables to it and releases every listener on the previous one", async () => {
  const first = createAnchor({ answer: signedIn("ada") });
  const second = createAnchor({ answer: signedIn("grace") });

  await first.anchor.start();
  await second.anchor.start();

  const Name = defineComponent(() => {
    const state = useSession();

    return () => h("p", `${getName(state.value)}`);
  });

  const { view, current } = mountInProvider(first.anchor, Name);

  await nextTick();

  expect(view.text()).toBe("ada");

  current.value = second.anchor;
  await nextTick();

  expect(view.text()).toBe("grace");
  expect(first.live.subscriptions).toBe(0);
  expect(second.live.subscriptions).toBe(1);
});

test("a selector that closes over a prop reads the new prop on the next render, with no change of state", async () => {
  const { anchor } = createAnchor({ answer: signedIn("ada") });
  const greeting = shallowRef("Hello");

  await anchor.start();

  const Greeting = defineComponent(
    (props: { greeting: string }) => {
      const text = useSession((state) => `${props.greeting} ${getName(state)}`);

      return () => h("p", text.value);
    },
    { props: { greeting: { type: String, required: true } } },
  );

  const view = mount(
    defineComponent(
      () => () =>
        h(AnchorProvider, { anchor }, () =>
          h(Greeting, { greeting: greeting.value }),
        ),
    ),
  );

  views.add(view);
  await nextTick();

  expect(view.text()).toBe("Hello ada");

  greeting.value = "Welcome back";
  await nextTick();

  expect(view.text()).toBe("Welcome back ada");
});
