/**
 * One adapter call in flight: the running or queued read and how many `sync()`
 * callers wait for it, a token request with its waiters, or an ending.
 *
 * @example
 * ```ts
 * const tokens = anchor.diagnostics.get().operations.filter(({ kind }) => kind === "token");
 * ```
 */
export type DiagnosticOperation =
  | { kind: "read"; queued: boolean; waiters: number }
  | {
      kind: "token";
      session: { key: string };
      profile: string;
      forceRefresh: boolean;
      waiters: number;
    }
  | { kind: "end"; session: { key: string } };
