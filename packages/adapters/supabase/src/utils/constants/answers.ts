/** The answer for no Supabase session. */
export const SIGNED_OUT_ANSWER = Object.freeze({ status: "signed-out" });

/** A local-scope sign-out revokes this session on the server and clears it here. */
export const ENDED_RESULT = Object.freeze({
  local: "completed",
  remote: "completed",
  navigation: null,
});

/** The Supabase client no longer holds the session asked to end, so there is nothing to end. */
export const NOT_APPLICABLE_END_RESULT = Object.freeze({
  local: "not-applicable",
  remote: "not-applicable",
  navigation: null,
});

/** The one profile Supabase can mint: the session's access token. */
export const ACCESS_TOKEN_PROFILE = Object.freeze({ kind: "access-token" });
