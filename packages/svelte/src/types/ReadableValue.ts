/**
 * A reactive value read through `current`, the way Svelte's own reactive
 * classes expose one. It is read, never written.
 *
 * @example
 * ```ts
 * const state: ReadableValue<RegisteredSessionState> = useSession();
 * ```
 */
export type ReadableValue<TValue> = { get current(): TValue };
