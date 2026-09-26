import type { WorkosClientLike } from "src/types/WorkosClientLike";

/**
 * The user type of an AuthKit client, AuthKit's `User`, which a `user` mapper
 * receives.
 *
 * @example
 * ```ts
 * type User = WorkosUserOf<Awaited<ReturnType<typeof createClient>>>;
 * ```
 */
export type WorkosUserOf<TClient extends WorkosClientLike> = NonNullable<
  ReturnType<TClient["getUser"]>
>;
