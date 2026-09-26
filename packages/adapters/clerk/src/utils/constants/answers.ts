/** The answer for Clerk holding no active session. */
export const SIGNED_OUT_ANSWER = Object.freeze({ status: "signed-out" });

/** Clerk no longer holds the session asked to end, so there is nothing to end. */
export const NOT_APPLICABLE_END_RESULT = Object.freeze({
  local: "not-applicable",
  remote: "not-applicable",
  navigation: null,
});

/** A Clerk sign-out removes the session through the Frontend API and drops it from the instance. */
export const ENDED_RESULT = Object.freeze({
  local: "completed",
  remote: "completed",
  navigation: null,
});

/** The instance dropped the session, but its client still holds it: clerk-js swallowed the failure of the removal. */
export const UNKNOWN_REMOTE_END_RESULT = Object.freeze({
  local: "completed",
  remote: "unknown",
  navigation: null,
});
