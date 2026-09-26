import type { ClerkSessionToken } from "src/types/ClerkSessionToken";

/**
 * A token profile that mints the session's token through its `getToken()`,
 * from the JWT template it names, bypassing Clerk's token cache when the
 * caller asks for `forceRefresh`.
 *
 * @example
 * ```ts
 * const adapter = clerk({
 *   sdk: clerkInstance,
 *   tokens: { api: sessionToken(), supabase: sessionToken({ template: "supabase" }) },
 * });
 * ```
 */
export const sessionToken = ({
  template,
}: { template?: string } = {}): ClerkSessionToken =>
  Object.freeze({
    kind: "session-token",
    ...(template === undefined ? {} : { template }),
  });
