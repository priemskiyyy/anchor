import type { WorkosLike } from "src/types/WorkosLike";
import type { WorkosUserOf } from "src/types/WorkosUserOf";

/**
 * Options of `workos()` from `@priemskiyyy/anchor-workos-node`: the server's
 * `WorkOS` client, the password its sealed sessions are sealed with, the
 * cookie that carries them, and an optional mapper from the WorkOS user to
 * the plain data a session carries.
 *
 * @example
 * ```ts
 * const options: WorkosAdapterOptions<WorkOS, { id: string }> = {
 *   sdk: workos,
 *   cookiePassword,
 *   user: (user) => ({ id: user.id }),
 * };
 * ```
 */
export type WorkosAdapterOptions<TWorkos extends WorkosLike, TUser> = {
  sdk: TWorkos;
  /** The password your sealed sessions are sealed with, the `cookiePassword` you seal them with at sign-in. */
  cookiePassword: string;
  /** The name of the cookie that carries the sealed session; `wos-session` by default, as AuthKit and WorkOS's guides name it. */
  cookie?: string;
  /** Maps the WorkOS user to the plain data a session carries; a snapshot of its profile fields by default. */
  user?: (user: WorkosUserOf<TWorkos>) => TUser;
};
