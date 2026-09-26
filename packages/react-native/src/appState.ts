import type { SyncHint } from "@priemskiyyy/anchor";

import type { AppStateHintOptions } from "src/types/AppStateHintOptions";
import { ACTIVE_STATE } from "src/utils/constants/appState";

/**
 * Reads the session again each time the app returns to the foreground, so a
 * session that expired or ended elsewhere while the app slept shows at once.
 * Foregrounding is a reason to read, never proof that the session is valid,
 * and nothing refreshes in the background.
 *
 * @example
 * ```ts
 * import { AppState } from "react-native";
 *
 * const anchor = new Anchor({ adapter, hints: [appState({ sdk: AppState })] });
 * ```
 */
export const appState =
  ({ sdk }: AppStateHintOptions): SyncHint =>
  ({ sync }) => {
    let previous = sdk.currentState;

    const subscription = sdk.addEventListener("change", (next) => {
      const isForegrounded = next === ACTIVE_STATE && previous !== ACTIVE_STATE;

      previous = next;

      if (!isForegrounded) {
        return;
      }

      sync();
    });

    return () => subscription.remove();
  };
