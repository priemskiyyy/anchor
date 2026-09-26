import { AnchorError } from "@priemskiyyy/anchor";
import { useContext } from "react";

import { AnchorContext } from "src/context/AnchorContext";
import type { RegisteredAnchor } from "src/types/Register";

/**
 * Returns the nearest provider's Anchor, starting and reading nothing, and
 * throws when there is no provider. Augment `Register` to type it.
 *
 * @example
 * ```tsx
 * const anchor = useAnchor();
 *
 * const handleLinkPress = async () => {
 *   await linkWithPopup(anchor.native.currentUser, provider);
 *   await anchor.sync();
 * };
 * ```
 */
export const useAnchor = (): RegisteredAnchor => {
  const anchor = useContext(AnchorContext);

  if (anchor === undefined) {
    throw new AnchorError({
      code: "INVALID_CONFIGURATION",
      message: "Anchor hooks must be used within an AnchorProvider.",
    });
  }

  return anchor;
};
