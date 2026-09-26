import type { SessionAdapter } from "src/types/SessionAdapter";
import type { SyncHint } from "src/types/SyncHint";

/**
 * Configuration of an `Anchor`: the adapter over the application's SDK, how
 * long one adapter call may take, and the hints that ask for a read.
 * Constructing an Anchor from it opens nothing.
 *
 * @example
 * ```ts
 * const anchor = new Anchor({ adapter: firebase({ sdk: auth }), timeout: 5_000 });
 * ```
 */
export type AnchorOptions<TUser, TNative, TProfile extends string> = {
  adapter: SessionAdapter<TUser, TNative, TProfile>;
  /** Milliseconds one adapter call may take before it fails with `TIMEOUT`; 10000 by default. */
  timeout?: number;
  /** Reasons to read the provider again, such as `visibility()` from `anchor-browser`: installed by `start()`, removed by `dispose()`. */
  hints?: SyncHint[];
};
