import type { SessionAction } from "@priemskiyyy/anchor";

/**
 * What `read` answers for a session your server vouches for: who it is, the
 * plain data it carries, and what else changes its permissions. An `action`
 * means the user must finish a step, such as accepting new terms, before the
 * session may do work.
 *
 * @example
 * ```ts
 * const answer: HttpSessionAnswer<{ name: string }> = {
 *   subject: "user_42",
 *   user: { name: "Ada" },
 *   context: "session_7",
 * };
 * ```
 */
export type HttpSessionAnswer<TUser> = {
  /** Your server's stable id of the user. */
  subject: string;
  /** Plain data the session carries. */
  user: TUser;
  /** Your server's tenant partition, when it has them. */
  tenant?: string | null | undefined;
  /** A deterministic fingerprint of what else changes permissions, such as the server's session id and the active organization. */
  context?: string | null | undefined;
  guest?: boolean | undefined;
  impersonated?: boolean | undefined;
  /** The step the user must finish before the session may do work. */
  action?: SessionAction | null | undefined;
};
