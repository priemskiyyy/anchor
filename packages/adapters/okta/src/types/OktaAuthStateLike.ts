import type { OktaTokensLike } from "src/types/OktaTokensLike";

/**
 * The parts of an okta-auth-js `AuthState` the adapter reads: whether Okta
 * counts the session as authenticated, the ID token that names it, the
 * refresh token that may still renew it, and the error a failed
 * `transformAuthState` leaves.
 *
 * @example
 * ```ts
 * const authState: OktaAuthStateLike = await oktaAuth.authStateManager.updateAuthState();
 * ```
 */
export type OktaAuthStateLike = {
  isAuthenticated?: boolean;
  idToken?: OktaTokensLike["idToken"];
  /** Kept through a renewal that failed on the way, and removed once Okta refuses it as invalid. */
  refreshToken?: OktaTokensLike["refreshToken"];
  error?: unknown;
};
