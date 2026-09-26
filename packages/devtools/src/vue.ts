import { AnchorDevtools as Devtools } from "@priemskiyyy/anchor-devtools";
import { useAnchor } from "@priemskiyyy/anchor-vue";
import {
  defineComponent,
  h,
  onMounted,
  onUnmounted,
  shallowRef,
  watch,
} from "vue";

import type { AnchorDevtoolsProps } from "src/types/AnchorDevtoolsProps";
import { DEFAULT_MAX_EVENTS } from "src/utils/constants/defaults";

export type { AnchorDevtoolsProps } from "src/types/AnchorDevtoolsProps";

/**
 * Mounts the inspector for the Anchor the nearest `AnchorProvider` held when
 * the component was set up, which is what `useAnchor()` returns. It renders an
 * empty host element on the server and removes the inspector when it
 * unmounts.
 *
 * @example
 * ```vue
 * <AnchorProvider :anchor="anchor">
 *   <Application />
 *   <AnchorDevtools v-if="isDevelopment" />
 * </AnchorProvider>
 * ```
 */
export const AnchorDevtools = defineComponent(
  (props: AnchorDevtoolsProps) => {
    const host = shallowRef<HTMLDivElement | null>(null);

    const devtools = new Devtools({
      anchor: useAnchor(),
      initialIsOpen: props.initialIsOpen ?? false,
      maxEvents: props.maxEvents ?? DEFAULT_MAX_EVENTS,
    });

    watch(
      () => props.maxEvents ?? DEFAULT_MAX_EVENTS,
      (maxEvents) => devtools.setMaxEvents(maxEvents),
    );
    onMounted(() => {
      const element = host.value;

      // Mounted means rendered, so the template ref always holds the host here.
      if (element === null) {
        return;
      }

      devtools.mount(element);
    });
    onUnmounted(devtools.unmount);

    return () => h("div", { ref: host, "data-anchor-devtools": "" });
  },
  {
    name: "AnchorDevtools",
    // An explicit undefined default keeps an absent prop absent, so Vue does not cast it to false.
    props: {
      initialIsOpen: { type: Boolean, default: undefined },
      maxEvents: { type: Number, default: undefined },
    },
  },
);
