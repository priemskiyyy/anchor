import { crossTab, online, visibility } from "@priemskiyyy/anchor-browser";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { createSessionLab } from "example-shared/lab/createSessionLab";
import { Application } from "src/Application";
import "src/styles.css";
import { createDevtoolsControls } from "src/utils/createDevtoolsControls";

const root = document.getElementById("root");

if (root === null) {
  throw new Error("The page has no #root element.");
}

// Created once, outside React, so Strict Mode cannot start a second Anchor.
const lab = createSessionLab({
  hints: [visibility(), online(), crossTab({ name: "session-lab" })],
  devtools: createDevtoolsControls(document),
});

createRoot(root).render(
  <StrictMode>
    <Application lab={lab} />
  </StrictMode>,
);
