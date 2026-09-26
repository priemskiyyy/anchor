/** The adapter's name in diagnostics. */
export const SUPABASE_ADAPTER_NAME = "supabase-node";

/** The authority of every Supabase principal, the same as the client adapter's, so one user is one principal on both sides. */
export const SUPABASE_AUTHORITY = "supabase";

/** The error supabase-js answers when the request's cookies carry no session, or Supabase Auth no longer holds the session they carry. */
export const SESSION_MISSING_ERROR_NAME = "AuthSessionMissingError";

/** The codes Supabase Auth refuses a request's session with: a token it cannot verify, a user it no longer has or has banned, and a refresh token that is unknown, spent or past its session's lifetime. */
export const SIGNED_OUT_ERROR_CODES = Object.freeze([
  "bad_jwt",
  "user_not_found",
  "user_banned",
  "refresh_token_not_found",
  "refresh_token_already_used",
  "session_expired",
]);
