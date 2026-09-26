import type { SyncHintTarget } from "src/types/SyncHintTarget";

/**
 * A reason to read the provider again, such as the page becoming visible.
 * `start()` installs it and `dispose()` calls the function it answers. A hint
 * is never proof that a session is valid: only the read that follows is.
 *
 * @example
 * ```ts
 * const focus: SyncHint = ({ sync }) => {
 *   window.addEventListener("focus", sync);
 *
 *   return () => window.removeEventListener("focus", sync);
 * };
 * ```
 */
export type SyncHint = (target: SyncHintTarget) => () => void;
