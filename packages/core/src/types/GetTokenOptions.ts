/**
 * Options of `session.getToken()`: a signal that ends this caller's wait, and
 * whether to skip the provider's token cache.
 *
 * @example
 * ```ts
 * const token = await session.getToken("api", { signal, forceRefresh: true });
 * ```
 */
export type GetTokenOptions = {
  /** Ends this caller's wait only; the shared request stops when its last waiter leaves. */
  signal?: AbortSignal;
  /** Skips the provider's cache; such a request never joins, and is never joined by, one that does not. */
  forceRefresh?: boolean;
};
