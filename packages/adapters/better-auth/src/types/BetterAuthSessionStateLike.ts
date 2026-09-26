import type { BetterAuthSessionLike } from "src/types/BetterAuthSessionLike";

/**
 * A value of a Better Auth client's session atom: the session, the error of
 * the last fetch, whether a fetch is pending or refetching, and the refetch
 * that starts a new one.
 *
 * @example
 * ```ts
 * const { data, isPending }: BetterAuthSessionStateLike = authClient.useSession();
 * ```
 */
export type BetterAuthSessionStateLike = {
  data: BetterAuthSessionLike | null;
  error: unknown;
  isPending: boolean;
  isRefetching: boolean;
  /** Fetches the session again and resolves once that fetch settled or a newer one replaced it. */
  refetch: () => Promise<void>;
};
