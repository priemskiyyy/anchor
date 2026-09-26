import type { FirebaseAuthLike } from "src/types/FirebaseAuthLike";
import type { FirebaseIdToken } from "src/types/FirebaseIdToken";

/**
 * Options of `firebase()`: the application's `Auth` instance, an optional
 * mapper from the Firebase user to the plain data a session carries, and the
 * token profiles the adapter mints.
 *
 * @example
 * ```ts
 * const options: FirebaseAdapterOptions<Auth, { id: string }, { api: FirebaseIdToken }> = {
 *   sdk: getAuth(app),
 *   user: (user) => ({ id: user.uid }),
 *   tokens: { api: idToken() },
 * };
 * ```
 */
export type FirebaseAdapterOptions<
  TAuth extends FirebaseAuthLike,
  TUser,
  TTokens extends Record<string, FirebaseIdToken>,
> = {
  sdk: TAuth;
  /** Maps the Firebase user to the plain data a session carries; a snapshot of its profile fields by default. */
  user?: (user: NonNullable<TAuth["currentUser"]>) => TUser;
  tokens?: TTokens;
};
