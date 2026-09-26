import type { BetterAuthSessionLike } from "src/types/BetterAuthSessionLike";

/**
 * The part of the Better Auth server instance the server adapter calls. Pass
 * the `auth` that `betterAuth()` from `better-auth` returned; the adapter
 * never creates it.
 *
 * @example
 * ```ts
 * const sdk: BetterAuthServerLike = betterAuth({ database, emailAndPassword: { enabled: true } });
 * ```
 */
export type BetterAuthServerLike = {
  api: {
    getSession: (context: {
      headers: Headers;
      returnHeaders: true;
    }) => Promise<{ headers: Headers; response: BetterAuthSessionLike | null }>;
  };
};
