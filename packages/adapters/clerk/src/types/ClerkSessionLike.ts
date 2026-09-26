import type { ClerkUserLike } from "src/types/ClerkUserLike";

/**
 * The parts of a signed-in Clerk `Session` the adapter reads and calls: its
 * id, the active organization and the actor that fingerprint its context, its
 * user, the pending task that blocks it, and `getToken`.
 *
 * @example
 * ```ts
 * const session: ClerkSessionLike | null | undefined = clerk.session;
 * ```
 */
export type ClerkSessionLike = {
  id: string;
  lastActiveOrganizationId: string | null;
  /** Who impersonates the user, as the session's `act` claim names them, or `null`. */
  actor: { sub: string } | null;
  user: ClerkUserLike;
  getToken: (options: {
    template?: string;
    skipCache: boolean;
  }) => Promise<string | null>;
} & (
  | { status: "active" }
  | {
      status: "pending";
      /** The step the user must complete first, such as `choose-organization`. */
      currentTask: { key: string };
    }
);
