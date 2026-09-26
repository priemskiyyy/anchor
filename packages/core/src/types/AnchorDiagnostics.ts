import type { AnchorDiagnosticEvent } from "src/types/AnchorDiagnosticEvent";
import type { AnchorSnapshot } from "src/types/AnchorSnapshot";
import type { ObservableValue } from "src/types/ObservableValue";

/**
 * A passive view for devtools: the snapshot as an observable value, and a
 * timeline of diagnostic events that is assembled only while someone listens.
 *
 * @example
 * ```ts
 * const stop = anchor.diagnostics.subscribe(() => render(anchor.diagnostics.get()));
 * ```
 */
export type AnchorDiagnostics = ObservableValue<AnchorSnapshot> & {
  events: {
    subscribe: (listener: (event: AnchorDiagnosticEvent) => void) => () => void;
  };
};
