/** The adapter's name in diagnostics. */
export const CLERK_ADAPTER_NAME = "clerk-node";

/** Asks `toAuth()` for a pending session's auth, which it answers as signed out by default. */
export const PENDING_AS_SIGNED_IN = Object.freeze({
  treatPendingAsSignedOut: false,
});

/** The status of a session whose user has a task to complete first, the only word of it the session token carries. */
export const PENDING_SESSION_STATUS = "pending";

/** The reasons Clerk answers signed out for a request that carries no session: no credential at all, a client that says it holds none, and a token that is forged, foreign, stale or not a session token. */
export const SIGNED_OUT_REASONS = Object.freeze([
  "session-token-and-uat-missing",
  "client-uat-but-no-session-token",
  "session-token-but-no-client-uat",
  "session-token-iat-before-client-uat",
  "token-invalid",
  "token-invalid-algorithm",
  "token-invalid-signature",
  "token-invalid-authorized-parties",
  "token-verification-failed",
  "token-type-mismatch",
  "jwk-kid-mismatch",
]);

/** The start of the reason Clerk answers for an expired session token, followed by what came of refreshing it, such as `session-token-expired-refresh-non-eligible-no-refresh-cookie`. */
export const EXPIRED_SESSION_TOKEN_REASON = "session-token-expired-refresh-";

/** What came of refreshing an expired session token when the request carries nothing to refresh with, is not a GET Clerk would refresh, or holds a token that is no session token; any other outcome, a Backend API or network failure among them, cannot tell. */
export const SIGNED_OUT_REFRESH_OUTCOMES = Object.freeze([
  "non-eligible-no-refresh-cookie",
  "non-eligible-non-get",
  "missing-session-token",
  "missing-refresh-token",
  "expired-session-token-decode-failed",
  "expired-session-token-missing-sid-claim",
]);
