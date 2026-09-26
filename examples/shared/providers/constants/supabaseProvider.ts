import { SUPABASE_ID } from "example-shared/providers/supabase/constants/supabase";
import { createSupabaseProvider } from "example-shared/providers/supabase/createSupabaseProvider";
import type { LabProvider } from "example-shared/providers/types/LabProvider";

/** Supabase Auth: pushes through onAuthStateChange, mints access tokens, and signs out this session on the server too. */
export const SUPABASE_PROVIDER: LabProvider = {
  id: SUPABASE_ID,
  label: "Supabase",
  name: "Supabase",
  icon: { monogram: "Sb", tone: "positive" },
  sdk: "supabase-js 2.117.1",
  capabilities: {
    observation: "push",
    credential: "access-token",
    organizations: false,
    ending:
      'local and remote completed: signOut({ scope: "local" }) ends this session on Supabase\'s server and clears it here',
    navigation: false,
    offlineStart: "restores",
    retry: "sync",
  },
  behaviors: {
    "other-tab": {
      available: true,
      outcome:
        "supabase-js heard the other tab through its storage and said SIGNED_IN: Anchor accepted the other person under a new key.",
    },
    "server-end": {
      available: true,
      outcome:
        "supabase-js keeps the session until its next refresh, so nothing changed here. Load slowly refreshes: the server refuses, supabase-js signs out and says so, and only then is Anchor signed out.",
    },
    offline: {
      available: true,
      outcome:
        "supabase-js keeps the session in its storage, so Anchor stays signed in. A refresh, Harbor's API or a sign-out now fails, and nobody is signed out.",
    },
    slow: {
      available: true,
      outcome:
        "Restoring, signing in, refreshing and signing out now take three seconds. Reload Harbor to watch it restore.",
    },
    "duplicate-event": {
      available: true,
      outcome:
        "supabase-js said SIGNED_IN again for the same session, as it does when a tab becomes visible. Anchor published nothing: no render, the same key.",
    },
    "stale-callback": {
      available: false,
      reason:
        "supabase-js reads its session under the lock its sign-ins take, so a read never overlaps a change.",
    },
    "two-factor": {
      available: false,
      reason:
        "The Supabase adapter reports no pending step: it does not map Supabase's assurance levels.",
    },
    "partial-end": {
      available: false,
      reason:
        "supabase-js keeps the session when a sign-out fails, so Anchor rejects with END_FAILED rather than ending partially. Go offline, then sign out, to see it.",
    },
  },
  create: createSupabaseProvider,
};
