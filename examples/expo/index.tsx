import { appState } from "@priemskiyyy/anchor-react-native";
import { registerRootComponent } from "expo";
import type React from "react";
import { AppState } from "react-native";

import { createSessionLab } from "example-shared/lab/createSessionLab";
import { Application } from "src/Application";

// Created once, outside React, so a rerender can never start a second Anchor.
const lab = createSessionLab({ hints: [appState({ sdk: AppState })] });

const Root: React.FunctionComponent = () => <Application lab={lab} />;

registerRootComponent(Root);
