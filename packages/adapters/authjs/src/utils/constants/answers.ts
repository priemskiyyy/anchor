/** The answer for Auth.js holding no session. */
export const SIGNED_OUT_ANSWER = Object.freeze({ status: "signed-out" });

/** Auth.js no longer holds the session asked to end, so there is nothing to end. */
export const NOT_APPLICABLE_END_RESULT = Object.freeze({
  local: "not-applicable",
  remote: "not-applicable",
  navigation: null,
});

/** The server cleared the session cookie; whether a copy of a JWT session stays valid, or a database session was deleted, the client cannot tell. */
export const ENDED_RESULT = Object.freeze({
  local: "completed",
  remote: "unknown",
  navigation: null,
});
