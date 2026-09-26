/** The answer for keycloak-js holding no token. */
export const SIGNED_OUT_ANSWER = Object.freeze({ status: "signed-out" });

/** keycloak-js no longer holds the session asked to end, so there is nothing to end. */
export const NOT_APPLICABLE_END_RESULT = Object.freeze({
  local: "not-applicable",
  remote: "not-applicable",
  navigation: null,
});

/** The tokens are cleared here, but keycloak-js built no logout page, so Keycloak's session is unknown. */
export const UNKNOWN_REMOTE_END_RESULT = Object.freeze({
  local: "completed",
  remote: "unknown",
  navigation: null,
});

/** The one profile keycloak-js mints: the access token. */
export const ACCESS_TOKEN_PROFILE = Object.freeze({ kind: "access-token" });
