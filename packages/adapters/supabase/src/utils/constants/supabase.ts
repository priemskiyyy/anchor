/** The adapter's name in diagnostics. */
export const SUPABASE_ADAPTER_NAME = "supabase";

/** The authority of every Supabase principal; Supabase user ids are UUIDs, unique across projects in practice. */
export const SUPABASE_AUTHORITY = "supabase";

/** The narrowest sign-out Supabase offers: this session, revoked on the server and cleared locally, never the user's other sessions. */
export const LOCAL_SCOPE = Object.freeze({ scope: "local" });

/** The event supabase-js emits to a new subscriber, with a null session even when initialization failed, so it is no evidence of signing out. */
export const INITIAL_SESSION_EVENT = "INITIAL_SESSION";
