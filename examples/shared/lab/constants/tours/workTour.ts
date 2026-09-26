import type { Tour } from "example-shared/lab/types/Tour";

/** Tour 1: a token requested for one session never lands on the next one. */
export const WORK_TOUR: Tour = {
  id: "work",
  title: "Work belongs to its session",
  summary:
    "Switch the person while a token is in flight: the request rejects, the late token is discarded, and Grace never sees Ada's projects.",
  steps: [
    {
      title: "Ada signs in",
      body: ({ name, capabilities }) =>
        capabilities.credential === "cookie"
          ? `Harbor signs Ada in through ${name}, and Anchor accepts her under a new key. Her projects load with the session cookie.`
          : `Harbor signs Ada in through ${name}, and Anchor accepts her under a new key. Her projects load with a token minted for that session.`,
      highlights: ["app-account", "session-card"],
      perform: async (actions) => {
        await actions.signIn("ada");
        await actions.waitForProjects();
      },
    },
    {
      title: "A slow request starts",
      body: ({ label, name, capabilities }) =>
        capabilities.credential === "cookie"
          ? `Load slowly asks Harbor's API for Ada's projects, which takes three seconds. ${label} mints no tokens, so the request carries the cookie.`
          : `Load slowly asks ${name} for a fresh token, which takes three seconds. Anchor shows the request in flight, bound to Ada's session.`,
      highlights: ["work-in-flight", "app-projects"],
      perform: async (actions) => {
        actions.startLoadingProjects({ slowly: true });
      },
    },
    {
      title: "Grace signs in before it lands",
      body: ({ capabilities }) =>
        capabilities.credential === "cookie"
          ? "Grace signs in on this device. Anchor replaces Ada's session under a new key and Grace's own projects load, while Ada's request is still in flight."
          : "Grace signs in on this device. Anchor replaces Ada's session under a new key, and Ada's token request rejects at once with SESSION_CHANGED.",
      highlights: ["session-card", "timeline"],
      perform: async (actions) => {
        await actions.signIn("grace");
        await actions.waitForProjects();
      },
    },
    {
      title: "The late answer changes nothing",
      body: ({ name, capabilities }) =>
        capabilities.credential === "cookie"
          ? "Three seconds later Ada's answer arrives. Harbor filed it under Ada's key, so Grace sees only her own projects."
          : `Three seconds later ${name}'s answer for Ada arrives. Anchor discards it, and Grace sees only her own projects.`,
      highlights: ["timeline", "app-projects"],
      perform: async (actions, { capabilities }) => {
        if (capabilities.credential === "cookie") {
          await actions.waitForLoads();

          return;
        }

        await actions.waitForEvent(["token discarded", "token failed"]);
      },
    },
  ],
};
