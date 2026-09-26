/** The answer for AuthKit holding no session. */
export const SIGNED_OUT_ANSWER = Object.freeze({ status: "signed-out" });

/** AuthKit no longer holds the session asked to end, so there is nothing to end. */
export const NOT_APPLICABLE_END_RESULT = Object.freeze({
  local: "not-applicable",
  remote: "not-applicable",
  navigation: null,
});

/** AuthKit cleared the session here and sent WorkOS its logout request, whose opaque answer it cannot read. */
export const SIGNED_OUT_HERE_RESULT = Object.freeze({
  local: "completed",
  remote: "unknown",
  navigation: null,
});

/** The one profile an AuthKit session mints: its access token. */
export const ACCESS_TOKEN_PROFILE = Object.freeze({ kind: "access-token" });
