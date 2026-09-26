import { AnchorDevtools as Devtools } from "@priemskiyyy/anchor-devtools";
import { useAnchor } from "@priemskiyyy/anchor-svelte";
import type { Attachment } from "svelte/attachments";

import type { AnchorDevtoolsProps } from "src/types/AnchorDevtoolsProps";
import { DEFAULT_MAX_EVENTS } from "src/utils/constants/defaults";

export type { AnchorDevtoolsProps } from "src/types/AnchorDevtoolsProps";

/**
 * Creates an attachment that mounts the inspector for the Anchor the nearest
 * `AnchorProvider` held when the component was created, which is what
 * `useAnchor()` returns. Call it while the component initializes; an
 * attachment never runs on the server.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   const devtools = createDevtoolsAttachment();
 * </script>
 *
 * <div {@attach devtools}></div>
 * ```
 */
export const createDevtoolsAttachment = ({
  initialIsOpen = false,
  maxEvents = DEFAULT_MAX_EVENTS,
}: AnchorDevtoolsProps = {}): Attachment<HTMLElement> => {
  const anchor = useAnchor();

  return (element) => {
    const devtools = new Devtools({ anchor, initialIsOpen, maxEvents });

    devtools.mount(element);

    return devtools.unmount;
  };
};
