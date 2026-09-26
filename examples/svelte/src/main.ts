import { mount, unmount } from "svelte";

import { createSessionLab } from "example-shared/lab/createSessionLab";
import Application from "src/Application.svelte";
import "src/styles.css";

const target = document.getElementById("root");

if (target === null) {
  throw new Error("The page has no #root element.");
}

const lab = createSessionLab();
const application = mount(Application, { target, props: { lab } });

const disposeHost = () => {
  window.removeEventListener("pagehide", disposeHost);
  unmount(application);
  lab.dispose();
};

window.addEventListener("pagehide", disposeHost, { once: true });
import.meta.hot?.dispose(disposeHost);
