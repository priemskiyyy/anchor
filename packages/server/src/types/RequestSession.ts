import type { Principal } from "@priemskiyyy/anchor";

/**
 * The session one request carries, as the provider vouched for it on the
 * server. It has no key, no token and no ending: those belong to the client's
 * Anchor.
 *
 * @example
 * ```ts
 * const canEdit = (session: RequestSession<User>) => session.user.role === "editor";
 * ```
 */
export type RequestSession<TUser> = {
  principal: Principal;
  /** A frozen copy of the plain data the adapter mapped the provider's user to. */
  user: TUser;
  guest: boolean;
  impersonated: boolean;
};
