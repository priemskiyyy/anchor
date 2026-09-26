import type { SessionState } from "src/types/SessionState";

/**
 * What a sync hint sees of the session: its status, and its key while a
 * session is accepted. Never the user, a token or an operation.
 *
 * @example
 * ```ts
 * const { status, key }: SyncHintSession = target.session.get();
 * ```
 */
export type SyncHintSession = {
  status: SessionState<unknown, never>["status"];
  key: string | null;
};
