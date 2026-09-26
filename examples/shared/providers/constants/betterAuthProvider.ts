import { BETTER_AUTH_ID } from "example-shared/providers/betterAuth/constants/betterAuth";
import { createBetterAuthProvider } from "example-shared/providers/betterAuth/createBetterAuthProvider";
import type { LabProvider } from "example-shared/providers/types/LabProvider";

/** Better Auth: pushes through its session atom, mints no tokens, and ends the cookie session on the server. */
export const BETTER_AUTH_PROVIDER: LabProvider = {
  id: BETTER_AUTH_ID,
  label: "Better Auth",
  name: "Better Auth",
  icon: { monogram: "BA", tone: "neutral" },
  sdk: "better-auth 1.7.6, the vanilla client with the organization plugin",
  capabilities: {
    observation: "push",
    credential: "cookie",
    organizations: true,
    ending:
      "local and remote completed: signOut() deletes the session on Better Auth's server and expires its cookie",
    navigation: false,
    offlineStart: "unavailable",
    retry: "sync",
  },
  behaviors: {
    "other-tab": {
      available: true,
      outcome:
        "Better Auth broadcast the other tab's sign-in, and this tab's session atom fetched again: Anchor accepted the other person under a new key.",
    },
    "server-end": {
      available: true,
      outcome:
        "Better Auth's atom still holds the session, so nothing changed here. Reload the projects: Harbor's API answers 401, Harbor reads again, and Better Auth's own 401 is the server's word, so Anchor signs out.",
    },
    offline: {
      available: true,
      outcome:
        "Better Auth's atom keeps the session it holds, so Anchor stays signed in. Reload Harbor now and the first read fails: unavailable, never signed out.",
    },
    slow: {
      available: true,
      outcome:
        "Every fetch of the session atom, signing in and signing out now take three seconds. Reload Harbor to watch it restore.",
    },
    "duplicate-event": {
      available: true,
      outcome:
        "The session atom published the same session again, as a window focus refetch does. Anchor published nothing: no render, the same key.",
    },
    "stale-callback": {
      available: false,
      reason:
        "Better Auth's read is the atom's own fetch, and a newer fetch cancels an older one, so a read never answers an older session.",
    },
    "two-factor": {
      available: false,
      reason:
        "Better Auth's two-factor plugin stops the sign-in before a session exists: the adapter reports no pending step.",
    },
    "partial-end": {
      available: false,
      reason:
        "In a browser, a Better Auth sign-out that fails keeps the session, so Anchor rejects with END_FAILED: only the Expo plugin ends partially.",
    },
  },
  create: createBetterAuthProvider,
};
