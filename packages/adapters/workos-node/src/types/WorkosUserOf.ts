import type { WorkosLike } from "src/types/WorkosLike";

/**
 * The user type of a `@workos-inc/node` client's sealed sessions, WorkOS's
 * `User`, which a `user` mapper receives.
 *
 * @example
 * ```ts
 * type User = WorkosUserOf<WorkOS>;
 * ```
 */
export type WorkosUserOf<TWorkos extends WorkosLike> = Extract<
  Awaited<
    ReturnType<
      ReturnType<TWorkos["userManagement"]["loadSealedSession"]>["authenticate"]
    >
  >,
  { authenticated: true }
>["user"];
