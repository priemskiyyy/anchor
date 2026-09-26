/** The adapter's name in diagnostics. */
export const AUTH0_ADAPTER_NAME = "auth0-react-native";

/** The credentials manager's error type for no stored credentials: its own word that it holds no session. */
export const NO_CREDENTIALS = "NO_CREDENTIALS";

/** The credentials manager's error types after which only the user can go on: a renewal Auth0 refused, no refresh token to renew with, the session ceiling reached, or a DPoP key that needs a new login. */
export const INTERACTION_ERRORS = Object.freeze({
  RENEW_FAILED: true,
  NO_REFRESH_TOKEN: true,
  SESSION_EXPIRED: true,
  DPOP_KEY_MISSING: true,
  DPOP_KEY_MISMATCH: true,
});
