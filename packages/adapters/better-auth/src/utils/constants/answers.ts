/** The answer for no Better Auth session. */
export const SIGNED_OUT_ANSWER = Object.freeze({ status: "signed-out" });

/** A Better Auth sign-out deletes the session on the server and expires its cookie here. */
export const ENDED_RESULT = Object.freeze({
  local: "completed",
  remote: "completed",
  navigation: null,
});

/** The Better Auth client no longer holds the session asked to end, so there is nothing to end. */
export const NOT_APPLICABLE_END_RESULT = Object.freeze({
  local: "not-applicable",
  remote: "not-applicable",
  navigation: null,
});

/** A sign-out the server never confirmed, after Better Auth's Expo plugin already cleared the session on the device. */
export const LOCALLY_ENDED_RESULT = Object.freeze({
  local: "completed",
  remote: "unknown",
  navigation: null,
});

/** The one profile Better Auth can mint: the token of the session the client holds. */
export const SESSION_TOKEN_PROFILE = Object.freeze({ kind: "session-token" });
