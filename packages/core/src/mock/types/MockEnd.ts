import type { EndRequest } from "src/types/EndRequest";
import type { EndResult } from "src/types/EndResult";

/**
 * One ending the mock recorded, and the controls a test answers it with while
 * endings are held.
 *
 * @example
 * ```ts
 * mock.ends[0]?.settle({ local: "completed", remote: "unknown", navigation: null });
 * ```
 */
export type MockEnd = {
  request: EndRequest;
  /** Answers the held ending: the provider signed out, the local session completed and nothing remote applied, unless told otherwise; `not-applicable` when the provider holds another session by then. */
  settle: (result?: EndResult) => void;
  /** Rejects the held ending with the error. */
  fail: (error: unknown) => void;
};
