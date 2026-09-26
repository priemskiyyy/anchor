/**
 * The parts of React Native's `AppState` the hint uses. Pass `AppState` from
 * `react-native`; the hint never imports it.
 *
 * @example
 * ```ts
 * import { AppState } from "react-native";
 *
 * const sdk: AppStateLike = AppState;
 * ```
 */
export type AppStateLike = {
  currentState: string | null;
  addEventListener: (
    type: "change",
    listener: (state: string) => void,
  ) => { remove: () => void };
};
