/**
 * What a read receives: a signal that aborts when the read times out or Anchor
 * is disposed.
 *
 * @example
 * ```ts
 * const read = async ({ signal }: ReadContext) => getSessionAnswer(await fetchSession({ signal }));
 * ```
 */
export type ReadContext = { signal: AbortSignal };
