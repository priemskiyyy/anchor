import { AnchorError } from "@priemskiyyy/anchor";
import { inject } from "vue";
import type { ComputedRef } from "vue";

import { ANCHOR_CONTEXT } from "src/context/AnchorContext";
import type { RegisteredAnchor } from "src/types/Register";

export const useProvidedAnchorRef = (): ComputedRef<RegisteredAnchor> => {
  const anchor = inject(ANCHOR_CONTEXT, undefined);

  if (anchor === undefined) {
    throw new AnchorError({
      code: "INVALID_CONFIGURATION",
      message: "Anchor composables must be used within an AnchorProvider.",
    });
  }

  return anchor;
};
