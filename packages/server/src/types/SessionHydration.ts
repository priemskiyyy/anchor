import type { SessionAction } from "@priemskiyyy/anchor";

/**
 * What a server may put on the page about the session: its status and the
 * data `select` allowed, never a token, a cookie, SDK state or a provider
 * error. The client renders it until its Anchor resolves, and never takes it
 * for evidence.
 *
 * @example
 * ```ts
 * const hydration: SessionHydration<{ name: string }> = { status: "signed-in", user: { name: "Ada" } };
 * ```
 */
export type SessionHydration<TSnapshot> =
  | { status: "signed-out" }
  | {
      status: "signed-in";
      /** What `select` picked of the session, as it returned it. */
      user: TSnapshot;
    }
  | {
      status: "action-required";
      action: SessionAction;
      /** What `select` picked of the session, as it returned it. */
      user: TSnapshot;
    }
  | { status: "unavailable" };
