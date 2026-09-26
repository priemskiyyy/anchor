/** The adapter's name in diagnostics. */
export const AUTH0_ADAPTER_NAME = "auth0";

/** The errors auth0-spa-js answers when only the user can go on: signing in again, consenting or completing a second factor. */
export const INTERACTION_ERRORS = Object.freeze({
  login_required: true,
  consent_required: true,
  interaction_required: true,
  mfa_required: true,
  missing_refresh_token: true,
});
