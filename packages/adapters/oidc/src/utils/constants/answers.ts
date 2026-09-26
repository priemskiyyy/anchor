/** The answer for no user in the UserManager's store. */
export const SIGNED_OUT_ANSWER = Object.freeze({ status: "signed-out" });

/** The UserManager no longer holds the session asked to end, so there is nothing to end. */
export const NOT_APPLICABLE_END_RESULT = Object.freeze({
  local: "not-applicable",
  remote: "not-applicable",
  navigation: null,
});

/** The provider publishes no end-session endpoint: the user is removed here, and no page ends the provider's session. */
export const NO_END_SESSION_END_RESULT = Object.freeze({
  local: "completed",
  remote: "not-applicable",
  navigation: null,
});

/** The provider's metadata could not be read once the user was removed, so there is no page to open and the provider's session is unknown. */
export const UNKNOWN_REMOTE_END_RESULT = Object.freeze({
  local: "completed",
  remote: "unknown",
  navigation: null,
});

/** The one profile an OpenID Connect session mints: the user's access token. */
export const ACCESS_TOKEN_PROFILE = Object.freeze({ kind: "access-token" });
