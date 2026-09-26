import { FIREBASE_ID } from "example-shared/providers/firebase/constants/firebase";
import { createFirebaseProvider } from "example-shared/providers/firebase/createFirebaseProvider";
import type { LabProvider } from "example-shared/providers/types/LabProvider";

/** Firebase Auth: pushes through onIdTokenChanged, mints ID tokens, and signs out on this device only. */
export const FIREBASE_PROVIDER: LabProvider = {
  id: FIREBASE_ID,
  label: "Firebase",
  name: "Firebase",
  icon: { monogram: "Fb", tone: "warning" },
  sdk: "firebase 12.19.0, the modular Auth instance",
  capabilities: {
    observation: "push",
    credential: "id-token",
    organizations: false,
    ending:
      "local completed and remote not applicable: a Firebase client cannot revoke its session",
    navigation: false,
    offlineStart: "restores",
    retry: "sync",
  },
  behaviors: {
    "other-tab": {
      available: true,
      outcome:
        "Firebase shares its storage across tabs and told this one at once: Anchor accepted the other person under a new key.",
    },
    "server-end": {
      available: true,
      outcome:
        "Firebase keeps its ID token until it refreshes, so nothing changed here. Load slowly asks for a fresh token, and Firebase answers that the person must sign in again: still no logout.",
    },
    offline: {
      available: true,
      outcome:
        "Firebase keeps the session in its own storage, so Anchor stays signed in. A token refresh or Harbor's API now fails, and still nobody is signed out.",
    },
    slow: {
      available: true,
      outcome:
        "Restoring, signing in and refreshing now take three seconds. Reload Harbor to watch it restore.",
    },
    "duplicate-event": {
      available: true,
      outcome:
        "onIdTokenChanged reported the same user again. Anchor published nothing: no render, the same key.",
    },
    "stale-callback": {
      available: false,
      reason:
        "Firebase's read waits for its restore and then reads currentUser, so it never answers an older user.",
    },
    "two-factor": {
      available: false,
      reason:
        "The Firebase adapter reports no pending step: Firebase asks for a second factor before a session exists.",
    },
    "partial-end": {
      available: false,
      reason:
        "A Firebase sign-out is always local only, since the client cannot revoke: there is nothing partial to show.",
    },
  },
  create: createFirebaseProvider,
};
