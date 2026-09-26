import type { WorkosRefreshedSession } from "src/types/WorkosRefreshedSession";
import type { WorkosRefreshes } from "src/types/WorkosRefreshes";

/**
 * The AuthKit callbacks that tell the adapter about every sign-in, refresh,
 * organization switch and refresh failure. AuthKit takes its callbacks only
 * when `createClient()` creates the client, so create these first, hand them
 * to `createClient()`, and pass the same object to `workos()`.
 *
 * @example
 * ```ts
 * const refreshes = workosRefreshes();
 * const client = await createClient(clientId, {
 *   onRefresh: refreshes.handleRefresh,
 *   onRefreshFailure: refreshes.handleRefreshFailure,
 * });
 * const adapter = workos({ sdk: client, refreshes });
 * ```
 */
export const workosRefreshes = (): WorkosRefreshes => {
  const listeners = new Set<() => void>();
  let latest: WorkosRefreshedSession | null = null;

  const notify = () => {
    for (const listener of [...listeners]) {
      listener();
    }
  };

  return Object.freeze({
    handleRefresh: ({ organizationId, impersonator }) => {
      latest = Object.freeze({
        organizationId: organizationId ?? null,
        impersonator: impersonator?.email ?? null,
      });
      notify();
    },
    handleRefreshFailure: () => {
      latest = null;
      notify();
    },
    getLatestRefresh: () => latest,
    subscribe: (listener) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
  });
};
