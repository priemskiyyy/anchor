import type { ComputedRef, InjectionKey } from "vue";

import type { RegisteredAnchor } from "src/types/Register";

export const ANCHOR_CONTEXT: InjectionKey<ComputedRef<RegisteredAnchor>> =
  Symbol("anchor");
