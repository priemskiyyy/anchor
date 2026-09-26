import { createContext } from "react";

import type { RegisteredAnchor } from "src/types/Register";

export const AnchorContext = createContext<RegisteredAnchor | undefined>(
  undefined,
);
