import type { WorkosSealedSessionLike } from "src/types/WorkosSealedSessionLike";

/**
 * The part of the `@workos-inc/node` client the adapter calls. Pass the
 * `WorkOS` your server created with its API key and client id; the adapter
 * never creates it.
 *
 * @example
 * ```ts
 * const sdk: WorkosLike = new WorkOS(apiKey, { clientId });
 * ```
 */
export type WorkosLike = {
  userManagement: {
    loadSealedSession: (options: {
      sessionData: string;
      cookiePassword: string;
    }) => WorkosSealedSessionLike;
  };
};
