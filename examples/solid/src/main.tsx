import { render } from "solid-js/web";

import { createSessionLab } from "example-shared/lab/createSessionLab";
import { Application } from "src/Application";
import "src/styles.css";

const root = document.getElementById("root");

if (root === null) {
  throw new Error("The page has no #root element.");
}

const lab = createSessionLab();
const dispose = render(() => <Application lab={lab} />, root);

const disposeHost = () => {
  window.removeEventListener("pagehide", disposeHost);
  dispose();
  lab.dispose();
};

window.addEventListener("pagehide", disposeHost, { once: true });
import.meta.hot?.dispose(disposeHost);
