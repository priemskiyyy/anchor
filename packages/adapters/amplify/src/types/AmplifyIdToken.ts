/**
 * A token profile that mints the Cognito ID token of Amplify's auth session,
 * as `idToken()` returns it.
 *
 * @example
 * ```ts
 * const tokens: Record<string, AmplifyIdToken> = { identity: idToken() };
 * ```
 */
export type AmplifyIdToken = { kind: "id-token" };
