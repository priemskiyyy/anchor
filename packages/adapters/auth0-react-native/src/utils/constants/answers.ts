/** The answer for a credentials manager that holds no valid credentials. */
export const SIGNED_OUT_ANSWER = Object.freeze({ status: "signed-out" });

/** The credentials manager no longer holds the session asked to end, so there is nothing to end. */
export const NOT_APPLICABLE_END_RESULT = Object.freeze({
  local: "not-applicable",
  remote: "not-applicable",
  navigation: null,
});

/** The credentials are cleared on this device; Auth0's own session lives on in the browser the login used until `webAuth.clearSession()` ends it, so it is unknown. */
export const LOCAL_END_RESULT = Object.freeze({
  local: "completed",
  remote: "unknown",
  navigation: null,
});
