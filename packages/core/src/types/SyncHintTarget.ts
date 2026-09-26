import type { ObservableValue } from "src/types/ObservableValue";
import type { SyncHintSession } from "src/types/SyncHintSession";

/**
 * What `start()` hands each sync hint: a way to ask for a read, and the
 * session's status and key to decide when to.
 *
 * @example
 * ```ts
 * const hint: SyncHint = ({ sync, session }) => session.subscribe(() => console.debug(session.get().status));
 * ```
 */
export type SyncHintTarget = {
  /** Asks for a read of the provider. It never throws; a read that fails is recorded in diagnostics. */
  sync: () => void;
  /** The session's status and key, notified after every committed change; `get()` answers the same view until the state changes. */
  session: ObservableValue<SyncHintSession>;
};
