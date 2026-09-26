import { KEYCLOAK_ID } from "example-shared/providers/keycloak/constants/keycloak";
import { createKeycloakProvider } from "example-shared/providers/keycloak/createKeycloakProvider";
import type { LabProvider } from "example-shared/providers/types/LabProvider";

/** Keycloak: pushes through its chained callbacks, mints access tokens, and hands back its logout page. */
export const KEYCLOAK_PROVIDER: LabProvider = {
  id: KEYCLOAK_ID,
  label: "Keycloak",
  name: "Keycloak",
  icon: { monogram: "Kc", tone: "info" },
  sdk: "keycloak-js 26.2.4",
  capabilities: {
    observation: "push",
    credential: "access-token",
    organizations: true,
    ending:
      "local completed and remote unknown, with Keycloak's logout page: Keycloak's own session survives until the browser opens it",
    navigation: true,
    offlineStart: "unavailable",
    retry: "reload",
  },
  behaviors: {
    "other-tab": {
      available: false,
      reason:
        "keycloak-js keeps its tokens in this tab's memory, so another tab's sign-in never reaches them.",
    },
    "server-end": {
      available: true,
      outcome:
        "keycloak-js holds its tokens in memory, so nothing changed here. Load slowly refreshes: Keycloak refuses with a 400, keycloak-js clears its tokens and says so, and only then is Anchor signed out.",
    },
    offline: {
      available: true,
      outcome:
        "keycloak-js keeps its tokens, so Anchor stays signed in. Reload Harbor now and init() fails: unavailable, never signed out, until a reload online.",
    },
    slow: {
      available: true,
      outcome:
        "init(), signing in and refreshing now take three seconds. Reload Harbor to watch it restore.",
    },
    "duplicate-event": {
      available: true,
      outcome:
        "onAuthRefreshSuccess reported the same tokens again. Anchor published nothing: no render, the same key.",
    },
    "stale-callback": {
      available: false,
      reason:
        "keycloak-js's read waits for init() and then reads the token it holds, so it never answers an older one.",
    },
    "two-factor": {
      available: false,
      reason:
        "Keycloak asks for a second factor on its own login page, before a session exists: the adapter reports no pending step.",
    },
    "partial-end": {
      available: true,
      outcome:
        "The tokens were cleared here, but keycloak-js built no logout page this time: local completed, remote unknown.",
    },
  },
  create: createKeycloakProvider,
};
