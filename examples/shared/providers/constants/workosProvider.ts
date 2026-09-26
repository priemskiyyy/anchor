import type { LabProvider } from "example-shared/providers/types/LabProvider";
import { WORKOS_ID } from "example-shared/providers/workos/constants/workos";
import { createWorkosProvider } from "example-shared/providers/workos/createWorkosProvider";

/** WorkOS: the workosRefreshes() relay asks Anchor to read after every refresh, it mints access tokens, and ending clears AuthKit's session without navigating. */
export const WORKOS_PROVIDER: LabProvider = {
  id: WORKOS_ID,
  label: "WorkOS",
  name: "WorkOS",
  icon: { monogram: "Wo", tone: "neutral" },
  sdk: "authkit-js 0.20.2, the client createClient() returns",
  capabilities: {
    observation: "push",
    credential: "access-token",
    organizations: true,
    ending:
      "local completed and remote unknown: AuthKit clears its session and sends WorkOS a logout request whose answer it cannot read, and never navigates",
    navigation: false,
    offlineStart: "unavailable",
    retry: "sync",
  },
  behaviors: {
    "other-tab": {
      available: false,
      reason:
        "AuthKit keeps its user in this page's memory, so another tab's sign-in reaches it only at its next automatic refresh, just before the access token expires.",
    },
    "server-end": {
      available: true,
      outcome:
        "AuthKit keeps its tokens in memory, so nothing changed here. Load slowly refreshes: WorkOS refuses, AuthKit clears its session and calls onRefreshFailure, and only then is Anchor signed out.",
    },
    offline: {
      available: true,
      outcome:
        "AuthKit keeps its session in this page's memory, so Anchor stays signed in. Reload Harbor now and its first refresh fails on the network: unavailable, never signed out, until Retry online.",
    },
    slow: {
      available: true,
      outcome:
        "Refreshing, signing in and switching organizations now take three seconds. Reload Harbor to watch it restore.",
    },
    "duplicate-event": {
      available: true,
      outcome:
        "AuthKit's automatic refresh called onRefresh with the same user and organization. Anchor read again and published nothing: no render, the same key.",
    },
    "stale-callback": {
      available: false,
      reason:
        "AuthKit's read answers the user it holds in memory, and refreshes first only when it holds none, so it never answers an older user.",
    },
    "two-factor": {
      available: false,
      reason:
        "WorkOS asks for a second factor on its hosted sign-in page, before AuthKit holds a session: the adapter reports no pending step.",
    },
    "partial-end": {
      available: false,
      reason:
        "Every AuthKit sign-out is already local completed, remote unknown: AuthKit cannot read WorkOS's answer to its logout request, so there is nothing partial to show.",
    },
  },
  create: createWorkosProvider,
};
