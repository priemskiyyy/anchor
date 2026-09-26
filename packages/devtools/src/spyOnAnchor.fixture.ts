import { vi } from "vitest";

import type { ObservedAnchor } from "src/types/internal/ObservedAnchor";

type Subscription = "diagnostics" | "diagnostics.events";

export const spyOnAnchor = (anchor: ObservedAnchor) => {
  const { diagnostics } = anchor;
  const live = { diagnostics: 0, "diagnostics.events": 0 };

  const countSubscriptions =
    <TListener>(
      name: Subscription,
      subscribe: (listener: TListener) => () => void,
    ) =>
    (listener: TListener) => {
      live[name] += 1;

      const release = subscribe(listener);

      return () => {
        live[name] -= 1;
        release();
      };
    };

  vi.spyOn(anchor, "diagnostics", "get").mockReturnValue({
    ...diagnostics,
    subscribe: countSubscriptions("diagnostics", diagnostics.subscribe),
    events: {
      subscribe: countSubscriptions(
        "diagnostics.events",
        diagnostics.events.subscribe,
      ),
    },
  });

  return { live };
};
