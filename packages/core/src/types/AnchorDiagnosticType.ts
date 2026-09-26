import type { DIAGNOSTIC_TYPES } from "src/utils/constants/diagnostics";

/**
 * The closed list of phrases a diagnostic event's `type` can be, from
 * `anchor started` to `callback ignored`, so a consumer can dispatch on it
 * exhaustively.
 *
 * @example
 * ```ts
 * const failures: AnchorDiagnosticType[] = ["read failed", "token failed", "end failed"];
 * ```
 */
export type AnchorDiagnosticType =
  (typeof DIAGNOSTIC_TYPES)[keyof typeof DIAGNOSTIC_TYPES];
