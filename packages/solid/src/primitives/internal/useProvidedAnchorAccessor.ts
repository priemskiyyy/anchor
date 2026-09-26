import { AnchorError } from "@priemskiyyy/anchor";
import { useContext } from "solid-js";
import type { Accessor } from "solid-js";

import { AnchorContext } from "src/context/AnchorContext";
import type { RegisteredAnchor } from "src/types/Register";

export const useProvidedAnchorAccessor = (): Accessor<RegisteredAnchor> => {
  const anchor = useContext(AnchorContext);

  if (anchor === undefined) {
    throw new AnchorError({
      code: "INVALID_CONFIGURATION",
      message: "Anchor primitives must be used within an AnchorProvider.",
    });
  }

  return anchor;
};
