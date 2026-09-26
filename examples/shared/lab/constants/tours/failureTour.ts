import type { Tour } from "example-shared/lab/types/Tour";

/** Tour 2: a provider that cannot be read is unavailable, never signed out. */
export const FAILURE_TOUR: Tour = {
  id: "failure",
  title: "A failure is never a logout",
  summary:
    "Start Harbor offline: it is unavailable, not signed out, and back online Retry restores the same person.",
  steps: [
    {
      title: "Ada signs in",
      body: ({ name }) =>
        `Harbor signs Ada in through ${name}, and Anchor accepts her under a new key.`,
      highlights: ["session-card"],
      perform: async (actions) => {
        await actions.signIn("ada");
        await actions.waitForProjects();
      },
    },
    {
      title: "The network drops, and Harbor reloads",
      body: ({ label, capabilities }) =>
        capabilities.offlineStart === "unavailable"
          ? `${label} needs its server to restore a session, so the first read fails. Anchor is unavailable, not signed out: nothing says Ada left.`
          : `${label} restores Ada from its own storage, so even offline Anchor starts signed in: nothing says she left.`,
      highlights: ["app", "session-card"],
      perform: async (actions) => {
        actions.setOnline(false);
        await actions.reload();
      },
    },
    {
      title: "Retry while still offline",
      isSkipped: ({ capabilities }) =>
        capabilities.offlineStart !== "unavailable",
      body: () =>
        "Retry reads again and fails again, and the state stays as it was: unavailable, no sign-in screen, nobody signed out.",
      highlights: ["app", "timeline"],
      perform: async (actions) => {
        await actions.retry();
      },
    },
    {
      title: "Harbor's calls fail too",
      isSkipped: ({ capabilities }) => capabilities.offlineStart !== "restores",
      body: () =>
        "Loading the projects fails without the network, and Ada stays signed in: a failure is never a logout.",
      highlights: ["app-projects", "session-card"],
      perform: async (actions) => {
        await actions.loadProjects({ slowly: false });
      },
    },
    {
      title: "Back online",
      body: ({ label, capabilities }) => {
        if (capabilities.offlineStart === "restores") {
          return "Back online, the projects load again for the same session, which never changed.";
        }

        if (capabilities.retry === "reload") {
          return `${label} initializes only once per page, so Harbor reloads online, and Ada is restored: never a sign-in screen in between.`;
        }

        return "Back online, Retry reads again and restores Ada: the same person, never a sign-in screen in between.";
      },
      highlights: ["session-card", "app"],
      perform: async (actions, { capabilities }) => {
        actions.setOnline(true);

        if (capabilities.offlineStart === "restores") {
          await actions.loadProjects({ slowly: false });

          return;
        }

        if (capabilities.retry === "reload") {
          await actions.reload();
          await actions.waitForProjects();

          return;
        }

        await actions.retry();
        await actions.waitForProjects();
      },
    },
  ],
};
