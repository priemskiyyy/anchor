import type React from "react";

import { useIsHighlighted } from "src/hooks/useIsHighlighted";

// The devtools render in a shadow root of their own, so a tour points at their launcher from outside.
export const DevtoolsPointer: React.FunctionComponent = () =>
  useIsHighlighted("devtools") ? (
    <p className="pointer-events-none fixed right-5 bottom-18 z-30 rounded-full bg-blue-600 px-3 py-1 text-sm font-medium text-white shadow-lg dark:bg-blue-400 dark:text-zinc-950">
      The devtools, below
    </p>
  ) : null;
