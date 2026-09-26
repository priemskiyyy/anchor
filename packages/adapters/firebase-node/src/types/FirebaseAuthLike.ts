import type { FirebaseDecodedTokenLike } from "src/types/FirebaseDecodedTokenLike";

/**
 * The parts of firebase-admin's `Auth` the adapter calls. Pass the
 * `getAuth(app)` your server initialized, or a tenant's `TenantAwareAuth`;
 * the adapter never initializes, configures or signs in with it.
 *
 * @example
 * ```ts
 * const sdk: FirebaseAuthLike = getAuth(app);
 * ```
 */
export type FirebaseAuthLike = {
  verifySessionCookie: (
    sessionCookie: string,
    checkRevoked: boolean,
  ) => Promise<FirebaseDecodedTokenLike>;
  verifyIdToken: (
    idToken: string,
    checkRevoked: boolean,
  ) => Promise<FirebaseDecodedTokenLike>;
};
