/** The answer for an auth state Okta does not count as authenticated. */
export const SIGNED_OUT_ANSWER = Object.freeze({ status: "signed-out" });

/** okta-auth-js no longer holds the session asked to end, so there is nothing to end. */
export const NOT_APPLICABLE_END_RESULT = Object.freeze({
  local: "not-applicable",
  remote: "not-applicable",
  navigation: null,
});

/** okta-auth-js took on another session while this one's tokens were revoked, so nothing is cleared here and Okta's session is unknown. */
export const REPLACED_END_RESULT = Object.freeze({
  local: "not-applicable",
  remote: "unknown",
  navigation: null,
});

/** The tokens are revoked and cleared, but okta-auth-js built no sign-out page, so Okta's session is unknown. */
export const UNKNOWN_REMOTE_END_RESULT = Object.freeze({
  local: "completed",
  remote: "unknown",
  navigation: null,
});

/** The one profile the token manager mints: its access token. */
export const ACCESS_TOKEN_PROFILE = Object.freeze({ kind: "access-token" });
