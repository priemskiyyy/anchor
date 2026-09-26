import type { WorkosRefreshedSession } from "src/types/WorkosRefreshedSession";
import type { WorkosRefreshLike } from "src/types/WorkosRefreshLike";

/**
 * The two AuthKit callbacks that tell the adapter about every refresh, as
 * `workosRefreshes()` returns them: pass `handleRefresh` and
 * `handleRefreshFailure` to `createClient()`, and the same object to
 * `workos()`.
 *
 * @example
 * ```ts
 * const client = await createClient(clientId, {
 *   onRefresh: refreshes.handleRefresh,
 *   onRefreshFailure: refreshes.handleRefreshFailure,
 * });
 * ```
 */
export type WorkosRefreshes = {
  /** Pass as `createClient()`'s `onRefresh`; AuthKit calls it after every sign-in, refresh and organization switch. */
  handleRefresh: (refresh: WorkosRefreshLike) => void;
  /** Pass as `createClient()`'s `onRefreshFailure`; AuthKit calls it once a refresh it cannot retry cleared the session. */
  handleRefreshFailure: () => void;
  /** The organization and impersonator of the latest refresh, or `null` before one or after a failure. */
  getLatestRefresh: () => WorkosRefreshedSession | null;
  /** Calls `listener` after every refresh and refresh failure, until the function it returns is called. */
  subscribe: (listener: () => void) => () => void;
};
