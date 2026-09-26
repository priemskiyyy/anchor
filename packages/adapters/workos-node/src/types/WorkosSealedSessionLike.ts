import type { WorkosSessionLike } from "src/types/WorkosSessionLike";

/**
 * The parts of the `CookieSession` `loadSealedSession()` answers that the
 * adapter calls: `authenticate()`, which verifies the sealed access token,
 * and `refresh()`, which renews an expired one and seals the session again.
 *
 * @example
 * ```ts
 * const session: WorkosSealedSessionLike = workos.userManagement.loadSealedSession({ sessionData, cookiePassword });
 * ```
 */
export type WorkosSealedSessionLike = {
  authenticate: () => Promise<
    | ({ authenticated: true } & WorkosSessionLike)
    | { authenticated: false; reason: string }
  >;
  refresh: () => Promise<
    | ({
        authenticated: true;
        sealedSession?: string | undefined;
      } & WorkosSessionLike)
    | {
        authenticated: false;
        reason: string;
        /** Whether the refresh failed for a reason that may pass, such as the network, with the session still valid. */
        retryable: boolean;
        error?: unknown;
      }
  >;
};
