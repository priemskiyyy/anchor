import type { WorkosUserLike } from "src/types/WorkosUserLike";

/**
 * The parts of the AuthKit client the adapter calls. Pass the client
 * `createClient()` returned; the adapter never creates it, never signs anyone
 * in and never calls `dispose()`, which would clear AuthKit's session.
 *
 * @example
 * ```ts
 * const sdk: WorkosClientLike = await createClient(clientId, { onRefresh: refreshes.handleRefresh });
 * ```
 */
export type WorkosClientLike = {
  getUser: () => WorkosUserLike | null;
  getAccessToken: (options: { forceRefresh: boolean }) => Promise<string>;
  signOut: (options: { navigate: false }) => Promise<void>;
};
