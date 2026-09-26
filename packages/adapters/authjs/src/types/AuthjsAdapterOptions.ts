import type { AuthjsClientLike } from "src/types/AuthjsClientLike";
import type { AuthjsSessionOf } from "src/types/AuthjsSessionOf";

/**
 * Options of `authjs()`: the `next-auth/react` client module and an optional
 * mapper from its session to the plain data a session carries.
 *
 * @example
 * ```ts
 * const options: AuthjsAdapterOptions<typeof nextAuth, { id: string; role: string }> = {
 *   sdk: nextAuth,
 *   user: (session) => ({ id: session.user.id, role: session.user.role }),
 * };
 * ```
 */
export type AuthjsAdapterOptions<TClient extends AuthjsClientLike, TUser> = {
  sdk: TClient;
  /** Where Auth.js answers, the same `basePath` as `SessionProvider`'s; `/api/auth` by default. */
  basePath?: string;
  /** Maps the Auth.js session, your callback's fields included, to the plain data a session carries; a snapshot of its user by default. */
  user?: (session: AuthjsSessionOf<TClient>) => TUser;
};
