/** The answer for no ID token in the client's cache. */
export const SIGNED_OUT_ANSWER = Object.freeze({ status: "signed-out" });

/** The client no longer holds the session asked to end, so there is nothing to end. */
export const NOT_APPLICABLE_END_RESULT = Object.freeze({
  local: "not-applicable",
  remote: "not-applicable",
  navigation: null,
});
