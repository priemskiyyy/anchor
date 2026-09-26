import { createApp } from "vue";

import { createSessionLab } from "example-shared/lab/createSessionLab";
import Application from "src/Application.vue";
import "src/styles.css";

const root = document.getElementById("root");

if (root === null) {
  throw new Error("The page has no #root element.");
}

const lab = createSessionLab();
const application = createApp(Application, { lab });

application.mount(root);

const disposeHost = () => {
  window.removeEventListener("pagehide", disposeHost);
  application.unmount();
  lab.dispose();
};

window.addEventListener("pagehide", disposeHost, { once: true });
import.meta.hot?.dispose(disposeHost);
