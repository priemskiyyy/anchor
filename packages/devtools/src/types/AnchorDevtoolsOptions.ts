import type { ObservedAnchor } from "src/types/internal/ObservedAnchor";

/**
 * Options of `AnchorDevtools`: the Anchor to inspect and how the panel starts.
 * Typing the Anchor down to its diagnostics is what keeps the inspector passive.
 *
 * @example
 * ```ts
 * const options: AnchorDevtoolsOptions = { anchor, initialIsOpen: true, maxEvents: 500 };
 * ```
 */
export type AnchorDevtoolsOptions = {
  /** The Anchor to inspect. Only its `diagnostics` are ever read. */
  anchor: ObservedAnchor;
  /** Opens the panel on the first visit. Later visits restore the last open state. */
  initialIsOpen?: boolean;
  /** Events kept in memory. Defaults to 200, clamped to 1 to 1000. */
  maxEvents?: number;
};
