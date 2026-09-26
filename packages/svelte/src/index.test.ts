import { expect, test } from "vitest";

import * as api from "./index.js";

test("the entry exports exactly its public runtime names", () => {
  expect(Object.keys(api)).toEqual([
    "AnchorProvider",
    "useAnchor",
    "useSession",
  ]);
});
