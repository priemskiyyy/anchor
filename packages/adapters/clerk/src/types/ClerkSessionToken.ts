/**
 * A token profile that mints the session's token through `getToken()`, from
 * one of your JWT templates when it names one, as `sessionToken()` returns it.
 *
 * @example
 * ```ts
 * const profile: ClerkSessionToken = sessionToken({ template: "supabase" });
 * ```
 */
export type ClerkSessionToken = {
  kind: "session-token";
  /** The name of a JWT template in the Clerk Dashboard; the session token itself when absent. */
  template?: string;
};
