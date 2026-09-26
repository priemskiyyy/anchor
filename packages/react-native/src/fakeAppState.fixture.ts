import type { AppStateLike } from "src/types/AppStateLike";

type Listener = (state: string) => void;

// Modelled on React Native's AppState since 0.65, when addEventListener began answering a subscription: currentState is the last reported state, and each change listener hears every transition until its subscription is removed.
export const createFakeAppState = (initial: string | null = "active") => {
  const listeners = new Set<Listener>();

  const sdk = {
    currentState: initial,
    addEventListener: (_type: "change", listener: Listener) => {
      listeners.add(listener);

      return {
        remove: () => {
          listeners.delete(listener);
        },
      };
    },
  } satisfies AppStateLike;

  return {
    sdk,
    listeners,
    change: (state: string) => {
      sdk.currentState = state;

      for (const listener of [...listeners]) {
        listener(state);
      }
    },
  };
};
