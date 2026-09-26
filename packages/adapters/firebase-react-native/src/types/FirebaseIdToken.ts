/**
 * A token profile that mints the signed-in user's Firebase ID token, as
 * `idToken()` returns it.
 *
 * @example
 * ```ts
 * const tokens: Record<string, FirebaseIdToken> = { api: idToken() };
 * ```
 */
export type FirebaseIdToken = { kind: "id-token" };
