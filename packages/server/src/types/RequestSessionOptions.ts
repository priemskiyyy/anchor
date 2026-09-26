import type { ServerSessionAdapter } from "src/types/ServerSessionAdapter";

/**
 * Options of `getRequestSession()`: the server adapter, and how long its read
 * may take.
 *
 * @example
 * ```ts
 * const options: RequestSessionOptions<User, typeof auth> = { adapter: betterAuth({ sdk: auth }), timeout: 2_000 };
 * ```
 */
export type RequestSessionOptions<TUser, TNative> = {
  adapter: ServerSessionAdapter<TUser, TNative>;
  /** Milliseconds the read may take before the state is `unavailable` with `TIMEOUT`; 10000 by default. */
  timeout?: number;
};
