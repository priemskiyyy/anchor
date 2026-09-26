import type { Principal } from "src/types/Principal";

/**
 * The identity of the session a token or end request belongs to, exactly as the
 * adapter answered it, so the adapter can refuse to act for anyone else.
 *
 * @example
 * ```ts
 * if (auth.currentUser?.uid !== request.session.principal.subject) throw sessionChanged;
 * ```
 */
export type SessionIdentity = { principal: Principal; context: string | null };
