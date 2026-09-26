import type { Misbehavior } from "example-shared/lab/types/Misbehavior";

/** Every way the panel makes the provider misbehave, in the order it lists them. */
export const MISBEHAVIORS: Misbehavior[] = [
  {
    id: "other-tab",
    kind: "action",
    label: "Sign in as someone else in another tab",
    description: "The provider's storage changes behind this tab's back.",
    guarantee: "Work belongs to its session",
    needs: "session",
  },
  {
    id: "server-end",
    kind: "action",
    label: "End the session on the server",
    description: "The provider's server ends the session and tells nobody.",
    guarantee: "Signed out needs the provider's word",
    needs: "session",
  },
  {
    id: "offline",
    kind: "switch",
    label: "Offline",
    description: "Every call to the provider and to Harbor's API fails.",
    guarantee: "A failure is never a logout",
    needs: null,
  },
  {
    id: "slow",
    kind: "switch",
    label: "Slow provider",
    description: "Every call to the provider takes three seconds.",
    guarantee: "Work in flight stays with its session",
    needs: null,
  },
  {
    id: "duplicate-event",
    kind: "action",
    label: "Send a duplicate event",
    description: "The provider reports the session it already reported.",
    guarantee: "The same session publishes nothing new",
    needs: "session",
  },
  {
    id: "stale-callback",
    kind: "action",
    label: "Send a stale callback",
    description:
      "A slow read answers with the person the provider held before a sign-in.",
    guarantee: "A late answer never restores an older session",
    needs: "session",
  },
  {
    id: "two-factor",
    kind: "action",
    label: "Require two-factor",
    description: "The provider blocks the session until two-factor is set up.",
    guarantee: "A blocked session keeps its key and mints nothing",
    needs: "signed-in",
  },
  {
    id: "partial-end",
    kind: "action",
    label: "Sign out partially",
    description:
      "Signing out clears this device, but the provider cannot confirm its own session ended.",
    guarantee: "An ending says what it proved",
    needs: "session",
  },
];
