import { OKTA_ID } from "example-shared/providers/okta/constants/okta";
import { createOktaProvider } from "example-shared/providers/okta/createOktaProvider";
import type { LabProvider } from "example-shared/providers/types/LabProvider";

/** Okta: pushes through its auth state manager, mints access tokens, revokes them and hands back its sign-out page. */
export const OKTA_PROVIDER: LabProvider = {
  id: OKTA_ID,
  label: "Okta",
  name: "Okta",
  icon: { monogram: "Ok", tone: "accent" },
  sdk: "okta-auth-js 8.0.1",
  capabilities: {
    observation: "push",
    credential: "access-token",
    organizations: false,
    ending:
      "local completed and remote unknown, with Okta's sign-out page: the tokens are revoked, but Okta's own session survives until the browser opens it",
    navigation: true,
    offlineStart: "restores",
    retry: "sync",
  },
  behaviors: {
    "other-tab": {
      available: true,
      outcome:
        "okta-auth-js synced its token storage from the other tab and emitted the new auth state: Anchor accepted the other person under a new key.",
    },
    "server-end": {
      available: true,
      outcome:
        "okta-auth-js keeps its tokens, so nothing changed here. Load slowly renews: Okta refuses, okta-auth-js removes the access token and emits a signed-out state, and only then is Anchor signed out.",
    },
    offline: {
      available: true,
      outcome:
        "okta-auth-js keeps its tokens, so Anchor stays signed in. It removes the access token when any renewal fails, though, so Load slowly offline signs out, on okta-auth-js's own word.",
    },
    slow: {
      available: true,
      outcome:
        "Every auth state update, signing in and renewing now take three seconds. Reload Harbor to watch it restore.",
    },
    "duplicate-event": {
      available: false,
      reason:
        "okta-auth-js compares auth states itself and never emits the same one twice.",
    },
    "stale-callback": {
      available: false,
      reason:
        "okta-auth-js cancels an older auth state update when a newer one starts, so a read never answers an older session.",
    },
    "two-factor": {
      available: false,
      reason:
        "Okta asks for a second factor on its own sign-in page, before a session exists: the adapter reports no pending step.",
    },
    "partial-end": {
      available: true,
      outcome:
        "The tokens were revoked and cleared, but okta-auth-js built no sign-out page this time: local completed, remote unknown.",
    },
  },
  create: createOktaProvider,
};
