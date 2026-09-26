import { OIDC_ID } from "example-shared/providers/oidc/constants/oidc";
import { createOidcProvider } from "example-shared/providers/oidc/createOidcProvider";
import type { LabProvider } from "example-shared/providers/types/LabProvider";

/** Any OpenID Connect provider through oidc-client-ts: pushes its user events, mints access tokens, and hands back the end-session page. */
export const OIDC_PROVIDER: LabProvider = {
  id: OIDC_ID,
  label: "OIDC",
  name: "OIDC",
  icon: { monogram: "ID", tone: "info" },
  sdk: "oidc-client-ts 3.5.0, the UserManager",
  capabilities: {
    observation: "push",
    credential: "access-token",
    organizations: true,
    ending:
      "local completed and remote unknown, with the provider's end-session page: its own session survives until the browser opens it",
    navigation: true,
    offlineStart: "restores",
    retry: "sync",
  },
  behaviors: {
    "other-tab": {
      available: false,
      reason:
        "oidc-client-ts keeps each tab's user in that tab's sessionStorage, so another tab's sign-in never reaches this one.",
    },
    "server-end": {
      available: true,
      outcome:
        "oidc-client-ts keeps its stored user, so nothing changed here. Load slowly renews silently, the provider answers login_required, and Anchor rejects with INTERACTION_REQUIRED without signing out.",
    },
    offline: {
      available: true,
      outcome:
        "oidc-client-ts reads its user from sessionStorage, so Anchor stays signed in. A renewal or Harbor's API now fails, and a sign-out finds no end-session page: remote unknown.",
    },
    slow: {
      available: true,
      outcome:
        "Reading the user store and signing in now take three seconds. Reload Harbor to watch it restore.",
    },
    "duplicate-event": {
      available: true,
      outcome:
        "A silent renewal raised userLoaded with the same user. Anchor published nothing: no render, the same key.",
    },
    "stale-callback": {
      available: true,
      outcome:
        "A read began, the user store answered three seconds later with the person it found first, and userLoaded had reported the other person meanwhile. Anchor discarded the late answer: read superseded.",
    },
    "two-factor": {
      available: false,
      reason:
        "The provider asks for a second factor on its own login page, before a session exists: the adapter reports no pending step.",
    },
    "partial-end": {
      available: true,
      outcome:
        "The user was removed here, but the provider's metadata could not be read, so there is no end-session page: local completed, remote unknown.",
    },
  },
  create: createOidcProvider,
};
