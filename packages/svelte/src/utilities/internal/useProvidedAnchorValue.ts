import { AnchorError } from "@priemskiyyy/anchor";
import { getContext } from "svelte";
import { ANCHOR_CONTEXT } from "../../context/AnchorContext.js";
import type { ReadableValue } from "../../types/ReadableValue.js";
import type { RegisteredAnchor } from "../../types/Register.js";

export const useProvidedAnchorValue = (): ReadableValue<RegisteredAnchor> => {
  const anchor = getContext<ReadableValue<RegisteredAnchor> | undefined>(
    ANCHOR_CONTEXT,
  );

  if (anchor === undefined) {
    throw new AnchorError({
      code: "INVALID_CONFIGURATION",
      message: "Anchor utilities must be used within an AnchorProvider.",
    });
  }

  return anchor;
};
