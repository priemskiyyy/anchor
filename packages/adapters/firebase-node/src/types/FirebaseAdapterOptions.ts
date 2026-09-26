import type { FirebaseAuthLike } from "src/types/FirebaseAuthLike";
import type { FirebaseDecodedTokenOf } from "src/types/FirebaseDecodedTokenOf";

/**
 * Options of `firebase()` from `@priemskiyyy/anchor-firebase-node`: the
 * server's firebase-admin `Auth`, the cookie your server keeps the session
 * cookie in, whether each read checks for revocation, and an optional mapper
 * from the verified claims to the plain data a session carries.
 *
 * @example
 * ```ts
 * const options: FirebaseAdapterOptions<Auth, { id: string }> = {
 *   sdk: getAuth(app),
 *   cookie: "session",
 *   checkRevoked: true,
 *   user: (token) => ({ id: token.uid }),
 * };
 * ```
 */
export type FirebaseAdapterOptions<TAuth extends FirebaseAuthLike, TUser> = {
  sdk: TAuth;
  /** The name of the cookie your server sets the session cookie in; `__session` by default, the one cookie Firebase Hosting forwards to your functions. */
  cookie?: string;
  /** Whether each read asks Firebase Auth whether the user was disabled or its sessions revoked, as firebase-admin's `checkRevoked`; `false` by default. */
  checkRevoked?: boolean;
  /** Maps the verified claims to the plain data a session carries; a snapshot of the user's profile claims by default. */
  user?: (token: FirebaseDecodedTokenOf<TAuth>) => TUser;
};
