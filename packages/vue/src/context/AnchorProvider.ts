import { computed, defineComponent, provide } from "vue";

import { ANCHOR_CONTEXT } from "src/context/AnchorContext";
import type { RegisteredAnchor } from "src/types/Register";

/**
 * The props of `AnchorProvider`: the Anchor it publishes to the components
 * below.
 *
 * @example
 * ```ts
 * const props: AnchorProviderProps = { anchor };
 * ```
 */
export type AnchorProviderProps = {
  anchor: RegisteredAnchor;
};

/**
 * Publishes one Anchor to the components below and does nothing else: whoever
 * constructed it starts and disposes it, so mounting starts nothing and
 * unmounting disposes nothing. Augment `Register` first, or TypeScript refuses
 * an Anchor typed by its own adapter.
 *
 * @example
 * ```vue
 * <AnchorProvider :anchor="anchor">
 *   <Application />
 * </AnchorProvider>
 * ```
 */
export const AnchorProvider = defineComponent(
  (props: AnchorProviderProps, { slots }) => {
    provide(
      ANCHOR_CONTEXT,
      computed(() => props.anchor),
    );

    return () => slots.default?.();
  },
  {
    name: "AnchorProvider",
    props: { anchor: { type: Object, required: true } },
  },
);
