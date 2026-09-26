import type { OktaClaimsLike } from "src/types/OktaClaimsLike";

/**
 * The tokens of the okta-auth-js token manager the adapter reads: the ID token
 * and its claims, which name the session, the access token it mints, and the
 * refresh token it revokes.
 *
 * @example
 * ```ts
 * const tokens: OktaTokensLike = oktaAuth.tokenManager.getTokensSync();
 * ```
 */
export type OktaTokensLike = {
  idToken?: { idToken: string; claims: OktaClaimsLike };
  accessToken?: {
    accessToken: string;
    /** The token type Okta answered, `Bearer` or `DPoP`. */
    tokenType: string;
    /** When the token expires, in seconds since the epoch, as okta-auth-js counts. */
    expiresAt: number;
  };
  refreshToken?: { refreshToken: string };
};
