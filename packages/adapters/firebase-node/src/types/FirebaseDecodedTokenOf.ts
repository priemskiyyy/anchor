import type { FirebaseAuthLike } from "src/types/FirebaseAuthLike";

/**
 * The claims type an `Auth` answers for a verified credential, firebase-admin's
 * `DecodedIdToken`, which a `user` mapper receives.
 *
 * @example
 * ```ts
 * type Token = FirebaseDecodedTokenOf<Auth>;
 * ```
 */
export type FirebaseDecodedTokenOf<TAuth extends FirebaseAuthLike> = Awaited<
  ReturnType<TAuth["verifySessionCookie"]>
>;
