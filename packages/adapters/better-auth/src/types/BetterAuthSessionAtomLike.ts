import type { BetterAuthSessionStateLike } from "src/types/BetterAuthSessionStateLike";

/**
 * The session atom of a Better Auth client, the nanostores atom behind every
 * framework's `useSession`: `subscribe` calls a new subscriber at once, and
 * both it and `listen` call again after every change, pending and
 * refetching values included.
 *
 * @example
 * ```ts
 * const atom: BetterAuthSessionAtomLike | undefined = authClient.$store.atoms.session;
 * ```
 */
export type BetterAuthSessionAtomLike = {
  get: () => BetterAuthSessionStateLike;
  subscribe: (
    listener: (value: BetterAuthSessionStateLike) => void,
  ) => () => void;
  listen: (listener: (value: BetterAuthSessionStateLike) => void) => () => void;
};
