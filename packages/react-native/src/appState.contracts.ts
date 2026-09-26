import { AppState } from "react-native";
import { expectTypeOf } from "vitest";

import { appState } from "src/appState";
import type { AppStateLike } from "src/types/AppStateLike";

expectTypeOf(AppState).toExtend<AppStateLike>();

export const foreground = appState({ sdk: AppState });

// @ts-expect-error The hint takes React Native's AppState, not one of its states.
export const wrongSdk = appState({ sdk: AppState.currentState });
