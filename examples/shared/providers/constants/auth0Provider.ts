import { AUTH0_ID } from "example-shared/providers/auth0/constants/auth0";
import { createAuth0Provider } from "example-shared/providers/auth0/createAuth0Provider";
import type { LabProvider } from "example-shared/providers/types/LabProvider";

/** Auth0: emits nothing, mints access tokens per API, and hands back its logout page. */
export const AUTH0_PROVIDER: LabProvider = {
  id: AUTH0_ID,
  label: "Auth0",
  name: "Auth0",
  icon: { monogram: "A0", tone: "danger" },
  sdk: "auth0-spa-js 2.27.0",
  capabilities: {
    observation: "read",
    credential: "access-token",
    organizations: true,
    ending:
      "local completed and remote unknown, with Auth0's logout page: Auth0's own session survives until the browser opens it",
    navigation: true,
    offlineStart: "restores",
    retry: "sync",
  },
  behaviors: {
    "other-tab": {
      available: true,
      outcome:
        "auth0-spa-js told this tab nothing, so Anchor still shows who it had until its next read. A token asked for them now is refused, because Auth0's shared cache holds someone else.",
    },
    "server-end": {
      available: true,
      outcome:
        "auth0-spa-js keeps its cached tokens, so nothing changed here. Load slowly asks Auth0 for a fresh token, and Auth0 answers login_required: Anchor rejects with INTERACTION_REQUIRED and keeps the session.",
    },
    offline: {
      available: true,
      outcome:
        "auth0-spa-js reads its cache without the network, so Anchor stays signed in. A fresh token or Harbor's API now fails, and nobody is signed out.",
    },
    slow: {
      available: true,
      outcome:
        "Signing in, reading the cache and refreshing now take three seconds. Reload Harbor to watch it restore.",
    },
    "duplicate-event": {
      available: false,
      reason:
        "auth0-spa-js emits no events: Anchor learns a change on its next read, so there is no event to repeat.",
    },
    "stale-callback": {
      available: false,
      reason:
        "auth0-spa-js emits no events, so nothing newer can overtake a read: the latest read is the latest word.",
    },
    "two-factor": {
      available: false,
      reason:
        "Auth0 asks for a second factor inside its login page, before a session exists: the adapter reports no pending step.",
    },
    "partial-end": {
      available: false,
      reason:
        "Every Auth0 sign-out is already partial: local completed, remote unknown until the browser opens Auth0's logout page.",
    },
  },
  create: createAuth0Provider,
};
