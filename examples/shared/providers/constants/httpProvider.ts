import { HTTP_ID } from "example-shared/providers/http/constants/http";
import { createHttpProvider } from "example-shared/providers/http/createHttpProvider";
import type { LabProvider } from "example-shared/providers/types/LabProvider";

/** Your own backend through the http adapter: emits nothing, mints tokens bound by subject, and can block a session on a step. */
export const HTTP_PROVIDER: LabProvider = {
  id: HTTP_ID,
  label: "Your backend",
  name: "your backend",
  icon: { monogram: "API", tone: "neutral" },
  sdk: "your own API client, over the http adapter",
  capabilities: {
    observation: "read",
    credential: "access-token",
    organizations: true,
    ending:
      "local and remote completed: your end() resolves once your server ended exactly this session",
    navigation: false,
    offlineStart: "unavailable",
    retry: "sync",
  },
  behaviors: {
    "other-tab": {
      available: true,
      outcome:
        "The cookie changed and nothing told this tab, so Anchor still shows who it had until its next read. A token asked for them now is refused: your server minted it for someone else.",
    },
    "server-end": {
      available: true,
      outcome:
        "Your backend emits nothing, so nothing changed here. Reload the projects: your token endpoint refuses, Harbor reads again, and your server's 401 is its positive word, so Anchor signs out.",
    },
    offline: {
      available: true,
      outcome:
        "Your backend can't be reached, so a read fails and changes nothing: Anchor stays signed in. Reload Harbor now and the first read fails: unavailable, never signed out.",
    },
    slow: {
      available: true,
      outcome:
        "Every call to your backend now takes three seconds. Reload Harbor to watch it restore.",
    },
    "duplicate-event": {
      available: false,
      reason:
        "Your backend emits no events: Anchor learns a change on its next read, so there is no event to repeat.",
    },
    "stale-callback": {
      available: false,
      reason:
        "Your backend emits no events, so nothing newer can overtake a read: the latest read is the latest word.",
    },
    "two-factor": {
      available: true,
      outcome:
        "Your server now blocks the session until two-factor is set up. Anchor read again and shows action-required: the same key, and tokens are refused.",
    },
    "partial-end": {
      available: false,
      reason:
        "Your end() resolves once your server ended the session, or it throws: the http adapter reports no partial ending.",
    },
  },
  create: createHttpProvider,
};
