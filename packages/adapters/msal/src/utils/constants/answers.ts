/** The answer for MSAL holding no active account. */
export const SIGNED_OUT_ANSWER = Object.freeze({ status: "signed-out" });

/** MSAL no longer holds the session's account as its active one, so there is nothing to end. */
export const NOT_APPLICABLE_END_RESULT = Object.freeze({
  local: "not-applicable",
  remote: "not-applicable",
  navigation: null,
});

/** The account is cleared from MSAL's cache, but MSAL.js 5 hands out no logout page without navigating to it, so the Microsoft Entra session is unknown. */
export const LOCAL_END_RESULT = Object.freeze({
  local: "completed",
  remote: "unknown",
  navigation: null,
});
