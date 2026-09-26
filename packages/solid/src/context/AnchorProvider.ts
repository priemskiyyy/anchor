import { createComponent, createMemo } from "solid-js";
import type { ParentProps } from "solid-js";

import { AnchorContext } from "src/context/AnchorContext";
import type { RegisteredAnchor } from "src/types/Register";

/**
 * The props of `AnchorProvider`: the Anchor it publishes and the tree that
 * reads it.
 *
 * @example
 * ```tsx
 * const props: AnchorProviderProps = { anchor, children: <Application /> };
 * ```
 */
export type AnchorProviderProps = ParentProps<{
  anchor: RegisteredAnchor;
}>;

/**
 * Publishes one Anchor to the tree below and does nothing else: whoever
 * constructed it starts and disposes it, so mounting starts nothing and
 * unmounting disposes nothing. Augment `Register` first, or TypeScript refuses
 * an Anchor typed by its own adapter.
 *
 * @example
 * ```tsx
 * <AnchorProvider anchor={anchor}>
 *   <Application />
 * </AnchorProvider>
 * ```
 */
export const AnchorProvider = (props: AnchorProviderProps) =>
  createComponent(AnchorContext.Provider, {
    value: createMemo(() => props.anchor),
    get children() {
      return props.children;
    },
  });
