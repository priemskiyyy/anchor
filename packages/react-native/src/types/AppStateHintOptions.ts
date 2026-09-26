import type { AppStateLike } from "src/types/AppStateLike";

/**
 * Options of `appState()`: React Native's `AppState`.
 *
 * @example
 * ```ts
 * const options: AppStateHintOptions = { sdk: AppState };
 * ```
 */
export type AppStateHintOptions = {
  sdk: AppStateLike;
};
