import { AMPLIFY_ID } from "example-shared/providers/amplify/constants/amplify";
import { createAmplifyProvider } from "example-shared/providers/amplify/createAmplifyProvider";
import type { LabProvider } from "example-shared/providers/types/LabProvider";

/** Amplify: the Hub asks Anchor to read and its signedOut is final, it mints Cognito access tokens, and ending signs this device out only. */
export const AMPLIFY_PROVIDER: LabProvider = {
  id: AMPLIFY_ID,
  label: "Amplify",
  name: "Amplify",
  icon: { monogram: "Am", tone: "warning" },
  sdk: "aws-amplify 6.20.0, the auth functions and the Hub",
  capabilities: {
    observation: "push",
    credential: "access-token",
    organizations: false,
    ending:
      "local completed and remote unknown: Amplify signs this device out and goes on when revoking the refresh token fails, and on React Native a hosted UI logout page closed early answers local unknown",
    navigation: false,
    offlineStart: "restores",
    retry: "sync",
  },
  behaviors: {
    "other-tab": {
      available: true,
      outcome:
        "Another tab signed Ada out and Grace in on the same localStorage, and Amplify dispatches nothing here: Anchor learns it on its next read, and a token for Ada is refused meanwhile.",
    },
    "server-end": {
      available: true,
      outcome:
        "Amplify keeps its tokens, so nothing changed here. Load slowly refreshes: Cognito refuses, Amplify clears its tokens and says so on the Hub, and only then is Anchor signed out.",
    },
    offline: {
      available: true,
      outcome:
        "Amplify keeps its tokens in this browser's storage, so Anchor stays signed in and a reload restores Ada offline. Harbor's API now fails, and still nobody is signed out.",
    },
    slow: {
      available: true,
      outcome:
        "Reading the token store, signing in and refreshing now take three seconds. Reload Harbor to watch it restore.",
    },
    "duplicate-event": {
      available: true,
      outcome:
        "The Hub dispatched tokenRefresh again for the same tokens. Anchor read again and published nothing: no render, the same key.",
    },
    "stale-callback": {
      available: false,
      reason:
        "Amplify's read asks getCurrentUser() and fetchAuthSession() for the tokens stored when it runs, so it never answers an older user.",
    },
    "two-factor": {
      available: false,
      reason:
        "Cognito asks for a second factor inside signIn(), before Amplify stores any tokens: the adapter reports no pending step.",
    },
    "partial-end": {
      available: false,
      reason:
        "In a browser every Amplify sign-out is already local completed, remote unknown. Only React Native can answer local unknown, when the hosted UI's logout page is closed.",
    },
  },
  create: createAmplifyProvider,
};
