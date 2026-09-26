import type { AnchorDiagnosticType } from "src/types/AnchorDiagnosticType";

/**
 * One thing that happened inside Anchor, named by a phrase from a closed list
 * such as `session accepted` or `token discarded`. It never carries a token, a
 * user object or a provider's error.
 *
 * @example
 * ```ts
 * anchor.diagnostics.events.subscribe((event) => console.debug(event.type, event.context));
 * ```
 */
export type AnchorDiagnosticEvent = {
  type: AnchorDiagnosticType;
  session: { key: string } | null;
  timestamp: number;
  /** Frozen plain detail: statuses, profile names, error codes and counts. */
  context: unknown;
};
