import type { AuthjsSessionLike } from "src/types/AuthjsSessionLike";

/**
 * The parts of the `next-auth/react` client module the adapter calls. Pass
 * the module itself; the adapter never signs anyone in and never mounts a
 * `SessionProvider`.
 *
 * @example
 * ```ts
 * import * as nextAuth from "next-auth/react";
 *
 * const sdk: AuthjsClientLike = nextAuth;
 * ```
 */
export type AuthjsClientLike = {
  // Read for its type alone: the adapter reads the endpoint getSession() calls, because getSession() answers null for a failed request.
  getSession: (params: {
    broadcast: false;
  }) => Promise<AuthjsSessionLike | null>;
  signOut: (options: { redirect: false }) => Promise<{ url: string }>;
};
