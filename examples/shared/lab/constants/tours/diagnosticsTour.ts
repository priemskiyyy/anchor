import type { Tour } from "example-shared/lab/types/Tour";

/** Tour 6: observing Anchor creates no demand on the provider. */
export const DIAGNOSTICS_TOUR: Tour = {
  id: "diagnostics",
  title: "Diagnostics are passive",
  summary:
    "Open the devtools and turn on Show values: the provider's call counter never moves.",
  steps: [
    {
      title: "Harbor calls the provider",
      body: ({ name }) =>
        `Ada signs in, and every call Harbor and Anchor make to ${name}'s SDK adds one to the counter.`,
      highlights: ["provider-calls"],
      perform: async (actions) => {
        await actions.signIn("ada");
        await actions.waitForProjects();
      },
    },
    {
      title: "Open the devtools",
      body: () =>
        "The devtools read anchor.diagnostics and nothing else. The counter did not move.",
      highlights: ["provider-calls", "devtools"],
      perform: async ({ devtools }) => {
        devtools.open();
      },
    },
    {
      title: "Show the values",
      body: () =>
        "Show values reveals the principal in the devtools. Still no call to the provider.",
      highlights: ["provider-calls", "devtools"],
      perform: async ({ devtools }) => {
        devtools.showValues();
      },
    },
    {
      title: "Close the devtools",
      body: () =>
        "Observing created no demand: the counter is where it was before the devtools opened.",
      highlights: ["provider-calls"],
      perform: async ({ devtools }) => {
        devtools.close();
      },
    },
  ],
};
