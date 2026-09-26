/**
 * The parts of an Auth.js client session the adapter reads: its user, with
 * the id your `session` callback adds, which Auth.js leaves out by default.
 *
 * @example
 * ```ts
 * const session: AuthjsSessionLike | null = await getSession();
 * ```
 */
export type AuthjsSessionLike = {
  user?:
    | {
        /** The user's id, which only your `session` callback puts in the client session. */
        id?: string | undefined;
        name?: string | null | undefined;
        email?: string | null | undefined;
        image?: string | null | undefined;
      }
    | undefined;
};
