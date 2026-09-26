/**
 * What a server adapter reads for one request: its URL, method and headers,
 * which carry the provider's cookies, the headers the response must carry,
 * and a signal that aborts at the timeout.
 *
 * @example
 * ```ts
 * const read = async ({ headers, responseHeaders, signal }: ServerSessionRequest) => fetchSession(headers, responseHeaders, { signal });
 * ```
 */
export type ServerSessionRequest = {
  url: string;
  method: string;
  /** The request's own headers, which the adapter never changes. */
  headers: Headers;
  /** Where the adapter sets what the response must carry, such as a refreshed or deleted session cookie: it reaches the response whatever the read answers or throws. */
  responseHeaders: Headers;
  signal: AbortSignal;
};
