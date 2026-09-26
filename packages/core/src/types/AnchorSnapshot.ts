import type { DiagnosticOperation } from "src/types/DiagnosticOperation";
import type { Principal } from "src/types/Principal";
import type { SessionState } from "src/types/SessionState";

/**
 * Frozen lifecycle, session and operation counts from diagnostics. It holds no
 * token, no user object and no provider error; the principal is there for
 * debugging, and the devtools hide it until asked.
 *
 * @example
 * ```ts
 * const { state, session, operations } = anchor.diagnostics.get();
 * ```
 */
export type AnchorSnapshot = {
  /** `idle` until `start()`, `starting` until the first resolution, then `started`, and `disposed` for good. */
  state: "idle" | "starting" | "started" | "disposed";
  /** The adapter's own name, such as `firebase`. */
  adapter: { name: string };
  session: {
    status: SessionState<unknown, string>["status"];
    key: string | null;
    principal: Principal | null;
    /** Grows with every replacement of the security context. */
    generation: number;
  };
  operations: DiagnosticOperation[];
};
