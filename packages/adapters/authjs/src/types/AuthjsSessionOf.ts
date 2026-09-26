import type { AuthjsClientLike } from "src/types/AuthjsClientLike";

/**
 * The session type of a `next-auth/react` client, with the fields your
 * module augmentation adds, which a `user` mapper receives.
 *
 * @example
 * ```ts
 * type Session = AuthjsSessionOf<typeof nextAuth>;
 * ```
 */
export type AuthjsSessionOf<TClient extends AuthjsClientLike> = NonNullable<
  Awaited<ReturnType<TClient["getSession"]>>
>;
