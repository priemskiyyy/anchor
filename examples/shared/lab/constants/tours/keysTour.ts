import type { Tour } from "example-shared/lab/types/Tour";

/** Tour 3: the key changes exactly when the security context does. */
export const KEYS_TOUR: Tour = {
  id: "keys",
  title: "The key changes exactly when the security context does",
  summary:
    "A rename keeps the key, another organization or another person gets a new one, and a cache keyed by session.key never leaks.",
  steps: [
    {
      title: "Ada signs in: a new key",
      body: ({ label }) =>
        `${label} holds Ada now, and Anchor gives her session a new key. Harbor caches her projects under that key.`,
      highlights: ["session-card", "app-projects"],
      perform: async (actions) => {
        await actions.signIn("ada");
        await actions.waitForProjects();
      },
    },
    {
      title: "A rename keeps the key",
      body: ({ name }) =>
        `Ada changes her display name through ${name}. Same person, same organization, same session: Anchor updates the session in place and keeps the key.`,
      highlights: ["session-card", "app-account"],
      perform: async (actions) => {
        await actions.rename();
      },
    },
    {
      title: "Another organization is a new key",
      isSkipped: ({ capabilities }) => !capabilities.organizations,
      body: ({ name }) =>
        `Ada switches to Summit Works. For ${name} that is another security context, so Anchor issues a new key and Harbor's list under it starts empty: Harbor Labs' projects stay under the old key.`,
      highlights: ["session-card", "app-projects"],
      perform: async (actions) => {
        await actions.switchOrganization("summit");
        await actions.waitForProjects();
      },
    },
    {
      title: "Another person is a new key",
      body: () =>
        "Grace signs in on this device. Another person always gets another key, so nothing cached under Ada's keys can reach her.",
      highlights: ["session-card", "app-projects"],
      perform: async (actions) => {
        await actions.signIn("grace");
        await actions.waitForProjects();
      },
    },
  ],
};
