/** The adapter's name in diagnostics. */
export const OKTA_ADAPTER_NAME = "okta";

/** The token manager's own key for the access token, which it renews by when the token is stored under no other key. */
export const ACCESS_TOKEN_KEY = "accessToken";

/** The errors Okta answers a renewal with when only the user can go on: signing in, interacting, choosing an account, consenting, or a refresh token it no longer accepts. */
export const INTERACTION_ERRORS = Object.freeze({
  login_required: true,
  interaction_required: true,
  account_selection_required: true,
  consent_required: true,
  invalid_grant: true,
});
