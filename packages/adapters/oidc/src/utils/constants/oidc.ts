/** The adapter's name in diagnostics. */
export const OIDC_ADAPTER_NAME = "oidc";

/** The errors a provider answers a silent renewal with when only the user can go on: signing in, interacting, choosing an account, consenting, or a refresh token it no longer accepts. */
export const INTERACTION_ERRORS = Object.freeze({
  login_required: true,
  interaction_required: true,
  account_selection_required: true,
  consent_required: true,
  invalid_grant: true,
});
