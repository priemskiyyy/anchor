import type { ClerkSessionLike } from "src/types/ClerkSessionLike";

/**
 * The parts of a clerk-js `Clerk` instance the adapter reads and calls, the
 * same on the instance Clerk Expo's `getClerkInstance()` returns. Pass the
 * instance your application created; the adapter never calls `load()`,
 * `setActive()` or a sign-in.
 *
 * @example
 * ```ts
 * const sdk: ClerkLike = new Clerk(publishableKey);
 * ```
 */
export type ClerkLike = {
  /** Whether `load()` finished, which Clerk sets once its status is `ready` or `degraded`. */
  loaded: boolean;
  status: "degraded" | "error" | "loading" | "ready";
  /** The instance's Frontend API host, whose URL is the issuer of its session tokens. */
  frontendApi: string;
  /** The active session, `null` without one, or `undefined` while Clerk loads or switches sessions. */
  session: ClerkSessionLike | null | undefined;
  client: { signedInSessions: Array<{ id: string }> } | undefined;
  addListener: (
    listener: (resources: {
      session?: ClerkSessionLike | null | undefined;
    }) => void,
    options?: { skipInitialEmit?: boolean },
  ) => () => void;
  on: (event: "status", handler: () => void) => void;
  off: (event: "status", handler: () => void) => void;
  signOut: (
    callback: () => void,
    options: { sessionId: string },
  ) => Promise<void>;
};
