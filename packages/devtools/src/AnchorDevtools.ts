import { AnchorError } from "@priemskiyyy/anchor";
import { createComponent, createSignal } from "solid-js";
import type { Accessor, Setter } from "solid-js";
import { render } from "solid-js/web";

import { Devtools } from "src/components/Devtools";
import type { AnchorDevtoolsOptions } from "src/types/AnchorDevtoolsOptions";
import type { ObservedAnchor } from "src/types/internal/ObservedAnchor";
import { DEFAULT_MAX_EVENTS } from "src/utils/constants/defaults";
import { EventLog } from "src/utils/EventLog";

// attachShadow throws a DOMException for an element that cannot host a shadow root, or holds a closed one, which must not reach the host.
const attachShadowRoot = (element: HTMLElement) => {
  try {
    return element.attachShadow({ mode: "open" });
  } catch (error) {
    throw new AnchorError({
      code: "INVALID_CONFIGURATION",
      message:
        "Anchor devtools need an element that can host an open shadow root, such as a div.",
      cause: error,
    });
  }
};

/**
 * A framework-independent inspector for one Anchor, rendered in a shadow root
 * so host styles never leak in or out. It reads `anchor.diagnostics` and
 * nothing else, so it never starts the Anchor, reads the provider, mints a
 * token or ends a session, and it hides the principal until asked.
 *
 * @example
 * ```ts
 * const devtools = new AnchorDevtools({ anchor, initialIsOpen: false, maxEvents: 200 });
 *
 * devtools.mount(document.body.appendChild(document.createElement("div")));
 * ```
 */
export class AnchorDevtools {
  #anchor: Accessor<ObservedAnchor>;
  #setAnchor: Setter<ObservedAnchor>;
  #maxEvents: Accessor<number>;
  #setMaxEvents: Setter<number>;
  #initialIsOpen: boolean;
  #log = new EventLog();
  #dispose: (() => void) | null = null;

  constructor({
    anchor,
    initialIsOpen = false,
    maxEvents = DEFAULT_MAX_EVENTS,
  }: AnchorDevtoolsOptions) {
    const [currentAnchor, setAnchor] = createSignal(anchor);
    const [currentMaxEvents, setMaxEvents] = createSignal(maxEvents);

    this.#anchor = currentAnchor;
    this.#setAnchor = setAnchor;
    this.#maxEvents = currentMaxEvents;
    this.#setMaxEvents = setMaxEvents;
    this.#initialIsOpen = initialIsOpen;
  }

  /**
   * Renders the panel into a shadow root of `element`, which must be an
   * element that can host one, such as a `div`, and starts recording. Mounting
   * again before `unmount()`, or on an element that cannot host an open shadow
   * root, throws an `AnchorError`.
   *
   * @example
   * ```ts
   * devtools.mount(document.body.appendChild(document.createElement("div")));
   * ```
   */
  mount = (element: HTMLElement) => {
    if (this.#dispose !== null) {
      throw new AnchorError({
        code: "INVALID_CONFIGURATION",
        message: "Anchor devtools are already mounted. Call unmount() first.",
      });
    }

    const root = element.shadowRoot ?? attachShadowRoot(element);

    this.#dispose = render(
      () =>
        createComponent(Devtools, {
          anchor: this.#anchor,
          maxEvents: this.#maxEvents,
          initialIsOpen: this.#initialIsOpen,
          log: this.#log,
        }),
      root,
    );
  };

  /**
   * Removes the panel and stops observing. Recorded events survive until the
   * next mount, and unmounting twice does nothing.
   *
   * @example
   * ```ts
   * devtools.unmount();
   * ```
   */
  unmount = () => {
    if (this.#dispose === null) {
      return;
    }

    this.#dispose();
    this.#dispose = null;
  };

  /**
   * Points the inspector at another Anchor, for example after the application
   * replaced its own.
   *
   * @example
   * ```ts
   * devtools.setAnchor(nextAnchor);
   * ```
   */
  setAnchor = (anchor: ObservedAnchor) => {
    this.#setAnchor(() => anchor);
  };

  /**
   * Changes how many events are kept, clamped to 1 to 1000. The oldest beyond
   * the new limit are forgotten.
   *
   * @example
   * ```ts
   * devtools.setMaxEvents(500);
   * ```
   */
  setMaxEvents = (maxEvents: number) => {
    this.#setMaxEvents(maxEvents);
  };
}
