import { CLERK_ID } from "example-shared/providers/clerk/constants/clerk";
import { createClerkProvider } from "example-shared/providers/clerk/createClerkProvider";
import type { LabProvider } from "example-shared/providers/types/LabProvider";

/** Clerk: its listener pushes every change once `loaded`, a pending task is action-required, it mints a JWT template's token, and ending removes exactly this session. */
export const CLERK_PROVIDER: LabProvider = {
  id: CLERK_ID,
  label: "Clerk",
  name: "Clerk",
  icon: { monogram: "Ck", tone: "info" },
  sdk: "clerk-js 6.32.1, the Clerk instance",
  capabilities: {
    observation: "push",
    credential: "session-token",
    organizations: true,
    ending:
      "local and remote completed: signOut() removes exactly this session through the Frontend API without navigating, and a removal clerk-js could not send answers remote unknown",
    navigation: false,
    offlineStart: "unavailable",
    retry: "reload",
  },
  behaviors: {
    "other-tab": {
      available: true,
      outcome:
        "Clerk's client refuses a second sign-in, so the other tab signed Ada out first and clerk-js broadcast it here: Anchor signed out on Clerk's word. Reload Harbor and Clerk loads Grace.",
    },
    "server-end": {
      available: true,
      outcome:
        "clerk-js keeps the session until it next asks the Frontend API, so nothing changed here. Load slowly asks for a fresh token: the Frontend API refuses, clerk-js drops the session, and only then is Anchor signed out.",
    },
    offline: {
      available: true,
      outcome:
        "clerk-js keeps the session it loaded, so Anchor stays signed in. Reload Harbor now and load() fails: unavailable, never signed out, until a reload online.",
    },
    slow: {
      available: true,
      outcome:
        "Loading, signing in and minting tokens now take three seconds. Reload Harbor to watch it load.",
    },
    "duplicate-event": {
      available: true,
      outcome:
        "clerk-js called its listener with the same session again, as it does after a token refresh. Anchor published nothing: no render, the same key.",
    },
    "stale-callback": {
      available: false,
      reason:
        "clerk-js calls its listener synchronously with the session it holds, and a read waits for load() and answers that same session, so no answer is ever older.",
    },
    "two-factor": {
      available: true,
      outcome:
        "Clerk now requires two-factor, so the session is pending on its setup-mfa task: Anchor shows action-required under the same key and mints no token until the task is done.",
    },
    "partial-end": {
      available: true,
      outcome:
        "The removal never reached the Frontend API, and clerk-js answered it as done anyway: this tab dropped the session, Clerk's client still holds it, local completed, remote unknown.",
    },
  },
  create: createClerkProvider,
};
