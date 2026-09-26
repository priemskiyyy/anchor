import type { OktaAuthStateLike } from "src/types/OktaAuthStateLike";
import type { OktaTokensLike } from "src/types/OktaTokensLike";

/**
 * The parts of an okta-auth-js `OktaAuth` instance the adapter calls. Pass the
 * instance your application created and started; the adapter never starts
 * it, never handles a redirect and never calls `signOut()`.
 *
 * @example
 * ```ts
 * const sdk: OktaAuthLike = new OktaAuth({ issuer, clientId, redirectUri });
 * ```
 */
export type OktaAuthLike = {
  authStateManager: {
    updateAuthState: () => Promise<OktaAuthStateLike>;
    subscribe: (handler: (authState: OktaAuthStateLike) => void) => void;
    unsubscribe: (handler: (authState: OktaAuthStateLike) => void) => void;
  };
  tokenManager: {
    getTokensSync: () => OktaTokensLike;
    // A method, so that okta-auth-js's hasExpired(token: Token) is assignable.
    hasExpired(token: { expiresAt: number }): boolean;
    getStorageKeyByType: (type: "accessToken") => string | undefined;
    renew: (key: string) => Promise<unknown>;
    clear: () => void;
  };
  // A method, so that okta-auth-js's revokeAccessToken(accessToken?: AccessToken) is assignable.
  revokeAccessToken(
    accessToken?: NonNullable<OktaTokensLike["accessToken"]>,
  ): Promise<unknown>;
  // A method, so that okta-auth-js's revokeRefreshToken(refreshToken?: RefreshToken) is assignable.
  revokeRefreshToken(
    refreshToken?: NonNullable<OktaTokensLike["refreshToken"]>,
  ): Promise<unknown>;
  /** Builds the sign-out page; okta-auth-js 8.0.1 has it at runtime but leaves it out of its type declarations. */
  getSignOutRedirectUrl?: (options: {
    idToken: NonNullable<OktaTokensLike["idToken"]>;
  }) => string;
};
