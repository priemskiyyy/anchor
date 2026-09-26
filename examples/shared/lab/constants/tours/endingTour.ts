import type { Tour } from "example-shared/lab/types/Tour";
import { AUTH0_ID } from "example-shared/providers/auth0/constants/auth0";

/** Tour 4: ending means this session, and says what it proved. */
export const ENDING_TOUR: Tour = {
  id: "ending",
  title: "Ending means this session",
  summary:
    "Sign out answers what was proven here and at the provider, a partial end says what it could not prove, and Auth0 hands back its logout page.",
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
      title: "Signing out says what it proved",
      body: ({ name, capabilities }) =>
        `session.end() ends this session and nothing else, and ${name} answers ${capabilities.ending}.`,
      highlights: ["app-ended", "timeline"],
      perform: async (actions) => {
        await actions.signOut();
      },
    },
    {
      title: "A partial sign-out says what it could not prove",
      isSkipped: ({ behaviors }) => !behaviors["partial-end"].available,
      body: ({ name }) =>
        `Ada signs in and out again, and this time ${name} cannot confirm its own session ended: local completed, remote unknown, and Harbor says exactly that.`,
      highlights: ["app-ended"],
      perform: async (actions) => {
        await actions.signIn("ada");
        await actions.waitForProjects();
        await actions.misbehave("partial-end");
      },
    },
    {
      title: "A logout page finishes the job",
      body: ({ label, capabilities }) =>
        capabilities.navigation
          ? `Ada signs in and out once more. ${label} hands back its logout page, because its own session survives until the browser opens it.`
          : "Auth0 hands back its logout page: the lab switches to Auth0, signs Ada in and out, and Harbor offers the page, because Auth0's own session survives until the browser opens it.",
      highlights: ["app-ended", "provider-picker"],
      perform: async (actions, { capabilities }) => {
        if (!capabilities.navigation) {
          await actions.selectProvider(AUTH0_ID);
        }

        await actions.signIn("ada");
        await actions.waitForProjects();
        await actions.signOut();
      },
    },
  ],
};
