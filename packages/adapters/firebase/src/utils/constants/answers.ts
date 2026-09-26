/** The answer for no Firebase user. */
export const SIGNED_OUT_ANSWER = Object.freeze({ status: "signed-out" });

/** A Firebase sign-out ends the local session; the client has no remote step, so revoking refresh tokens stays with the Admin SDK. */
export const LOCAL_END_RESULT = Object.freeze({
  local: "completed",
  remote: "not-applicable",
  navigation: null,
});

/** The Firebase SDK no longer holds the session asked to end, so there is nothing to end. */
export const NOT_APPLICABLE_END_RESULT = Object.freeze({
  local: "not-applicable",
  remote: "not-applicable",
  navigation: null,
});

/** The one profile Firebase can mint: the user's ID token. */
export const ID_TOKEN_PROFILE = Object.freeze({ kind: "id-token" });
