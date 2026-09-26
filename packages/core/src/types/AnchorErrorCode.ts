/**
 * What went wrong, for an error Anchor or an adapter created: a
 * misconfiguration, a lifecycle misuse, a failed or late adapter call, an
 * answer outside the contract, or a session that is no longer the one the work
 * belonged to.
 *
 * @example
 * ```ts
 * const retryable: AnchorErrorCode[] = ["READ_FAILED", "TIMEOUT", "TOKEN_FAILED"];
 * ```
 */
export type AnchorErrorCode =
  | "INVALID_CONFIGURATION"
  | "NOT_STARTED"
  | "DISPOSED"
  | "START_FAILED"
  | "READ_FAILED"
  | "TIMEOUT"
  | "INVALID_ANSWER"
  | "SESSION_CHANGED"
  | "ACTION_REQUIRED"
  | "UNSUPPORTED"
  | "INTERACTION_REQUIRED"
  | "TOKEN_FAILED"
  | "END_FAILED"
  | "ABORTED";
