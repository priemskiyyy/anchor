import { createContext } from "solid-js";
import type { Accessor } from "solid-js";

import type { RegisteredAnchor } from "src/types/Register";

export const AnchorContext = createContext<Accessor<RegisteredAnchor>>();
