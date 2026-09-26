import { AnchorDevtools as Devtools } from "@priemskiyyy/anchor-devtools";
import { useAnchor } from "@priemskiyyy/anchor-react";
import { createElement, useCallback, useEffect, useState } from "react";

import type { AnchorDevtoolsProps } from "src/types/AnchorDevtoolsProps";
import { DEFAULT_MAX_EVENTS } from "src/utils/constants/defaults";

export type { AnchorDevtoolsProps } from "src/types/AnchorDevtoolsProps";

/**
 * Mounts the inspector for the nearest `AnchorProvider` and follows its
 * Anchor. It renders an empty host element on the server and removes the
 * inspector when it unmounts.
 *
 * @example
 * ```tsx
 * <AnchorProvider anchor={anchor}>
 *   <Application />
 *   {import.meta.env.DEV ? <AnchorDevtools /> : null}
 * </AnchorProvider>
 * ```
 */
export const AnchorDevtools = ({
  initialIsOpen = false,
  maxEvents = DEFAULT_MAX_EVENTS,
}: AnchorDevtoolsProps) => {
  const anchor = useAnchor();

  const [devtools] = useState(
    () => new Devtools({ anchor, initialIsOpen, maxEvents }),
  );

  useEffect(() => {
    devtools.setAnchor(anchor);
  }, [devtools, anchor]);

  useEffect(() => {
    devtools.setMaxEvents(maxEvents);
  }, [devtools, maxEvents]);

  // Stable, so a rerender keeps the mounted inspector. React 19 calls the returned cleanup, never this with null.
  const handleHostRef = useCallback(
    (element: HTMLDivElement) => {
      devtools.mount(element);

      return devtools.unmount;
    },
    [devtools],
  );

  return createElement("div", {
    ref: handleHostRef,
    "data-anchor-devtools": "",
  });
};
