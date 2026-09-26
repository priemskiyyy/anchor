/** The answer for Amplify holding no signed-in user. */
export const SIGNED_OUT_ANSWER = Object.freeze({ status: "signed-out" });

/** Amplify no longer holds the session asked to end, so there is nothing to end. */
export const NOT_APPLICABLE_END_RESULT = Object.freeze({
  local: "not-applicable",
  remote: "not-applicable",
  navigation: null,
});

/** Amplify signed this device out; whether Cognito revoked the refresh token is unknown, because Amplify goes on when the revocation fails. */
export const SIGNED_OUT_END_RESULT = Object.freeze({
  local: "completed",
  remote: "unknown",
  navigation: null,
});

/** signOut() returned without signing this device out, as Amplify does on React Native when the user closes the hosted UI's logout page. */
export const UNKNOWN_END_RESULT = Object.freeze({
  local: "unknown",
  remote: "unknown",
  navigation: null,
});

/** The profile that mints the session's Cognito access token. */
export const ACCESS_TOKEN_PROFILE = Object.freeze({ kind: "access-token" });

/** The profile that mints the session's Cognito ID token. */
export const ID_TOKEN_PROFILE = Object.freeze({ kind: "id-token" });
