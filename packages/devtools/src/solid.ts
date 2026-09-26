import { AnchorDevtools as Devtools } from "@priemskiyyy/anchor-devtools";
import { useAnchor } from "@priemskiyyy/anchor-solid";
import { createComponent, createEffect, onCleanup, onMount } from "solid-js";
import type { JSX } from "solid-js";
import { Dynamic, isServer } from "solid-js/web";

import type { AnchorDevtoolsProps } from "src/types/AnchorDevtoolsProps";
import { DEFAULT_MAX_EVENTS } from "src/utils/constants/defaults";

export type { AnchorDevtoolsProps } from "src/types/AnchorDevtoolsProps";

// Solid's element types declare no data attributes, so the host's is declared here.
const HOST_PROPS: JSX.HTMLAttributes<HTMLDivElement> & {
  "data-anchor-devtools": string;
} = { "data-anchor-devtools": "" };

/**
 * Mounts the inspector for the nearest `AnchorProvider` and follows its
 * Anchor. It renders an empty host element on the server and removes the
 * inspector on cleanup.
 *
 * @example
 * ```tsx
 * <AnchorProvider anchor={anchor}>
 *   <Application />
 *   {import.meta.env.DEV ? <AnchorDevtools /> : null}
 * </AnchorProvider>
 * ```
 */
export const AnchorDevtools = (props: AnchorDevtoolsProps) => {
  if (isServer) {
    return createComponent(Dynamic<"div">, { component: "div", ...HOST_PROPS });
  }

  const devtools = new Devtools({
    anchor: useAnchor(),
    initialIsOpen: props.initialIsOpen ?? false,
  });

  let host: HTMLDivElement | null = null;

  // Read inside the effect, so a provider given another Anchor runs it again.
  createEffect(() => devtools.setAnchor(useAnchor()));
  createEffect(() =>
    devtools.setMaxEvents(props.maxEvents ?? DEFAULT_MAX_EVENTS),
  );
  onMount(() => {
    // Mounted means rendered, so the ref always holds the host here.
    if (host === null) {
      return;
    }

    devtools.mount(host);
  });
  onCleanup(devtools.unmount);

  return createComponent(Dynamic<"div">, {
    component: "div",
    ...HOST_PROPS,
    ref: (element: HTMLDivElement) => {
      host = element;
    },
  });
};
