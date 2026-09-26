import type { SessionIdentity } from "src/types/SessionIdentity";

/**
 * One ending the core asks an adapter for: the session to end, and a signal
 * that aborts when that session is replaced or Anchor is disposed.
 *
 * @example
 * ```ts
 * const end = async ({ session }: EndRequest): Promise<EndResult> => {
 *   if (auth.currentUser?.uid !== session.principal.subject) {
 *     return { local: "not-applicable", remote: "not-applicable", navigation: null };
 *   }
 *
 *   await auth.signOut();
 *
 *   return { local: "completed", remote: "not-applicable", navigation: null };
 * };
 * ```
 */
export type EndRequest = { session: SessionIdentity; signal: AbortSignal };
