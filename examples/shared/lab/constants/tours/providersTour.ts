import type { Tour } from "example-shared/lab/types/Tour";
import { AUTH0_ID } from "example-shared/providers/auth0/constants/auth0";
import { BETTER_AUTH_ID } from "example-shared/providers/betterAuth/constants/betterAuth";
import { FIREBASE_ID } from "example-shared/providers/firebase/constants/firebase";
import { HTTP_ID } from "example-shared/providers/http/constants/http";
import { SUPABASE_ID } from "example-shared/providers/supabase/constants/supabase";

/** Tour 5: the same app over five providers, with the capabilities each has. */
export const PROVIDERS_TOUR: Tour = {
  id: "providers",
  title: "One app, any provider",
  summary:
    "Switch between Firebase, Supabase, Auth0, Better Auth and your own backend: the same app code, different capabilities.",
  steps: [
    {
      title: "Harbor on Firebase",
      body: () =>
        "Harbor signs Ada in through Firebase. Its code only reads useSession() and calls session.getToken() and session.end(): nothing in it is Firebase's.",
      highlights: ["provider-picker", "session-card"],
      perform: async (actions) => {
        await actions.selectProvider(FIREBASE_ID);
        await actions.signIn("ada");
        await actions.waitForProjects();
      },
    },
    {
      title: "The same app on Supabase",
      body: () =>
        "The adapter changes and Harbor does not. Ada is signed in through Supabase now: another authority, another subject, a new key.",
      highlights: ["provider-picker", "session-card", "app"],
      perform: async (actions) => {
        await actions.selectProvider(SUPABASE_ID);
        await actions.waitForProjects();
      },
    },
    {
      title: "Auth0 emits nothing",
      body: () =>
        "auth0-spa-js emits no events, so Anchor learns about Auth0 on its next read: Harbor calls anchor.sync() after a sign-in, and the panel below disables what needs events.",
      highlights: ["misbehaviors"],
      perform: async (actions) => {
        await actions.selectProvider(AUTH0_ID);
        await actions.waitForProjects();
      },
    },
    {
      title: "Better Auth mints no tokens",
      body: () =>
        "Better Auth keeps a cookie session, so Harbor's API trusts the cookie instead of a token: the same app, another credential, and nothing in flight at Anchor.",
      highlights: ["app-projects", "work-in-flight"],
      perform: async (actions) => {
        await actions.selectProvider(BETTER_AUTH_ID);
        await actions.waitForProjects();
      },
    },
    {
      title: "Your own backend",
      body: () =>
        "The http adapter maps your API's answers. Here your server asks for two-factor, and Harbor shows its step: action-required, under the same key.",
      highlights: ["app", "session-card"],
      perform: async (actions) => {
        await actions.selectProvider(HTTP_ID);
        await actions.waitForProjects();
        await actions.misbehave("two-factor");
      },
    },
  ],
};
