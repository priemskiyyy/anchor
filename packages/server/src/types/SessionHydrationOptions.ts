import type { RequestSession } from "src/types/RequestSession";

/**
 * Options of `getSessionHydration()`: the allowlist, as the function that
 * picks what of the session may reach the page.
 *
 * @example
 * ```ts
 * const options: SessionHydrationOptions<User, { name: string }> = { select: ({ user }) => ({ name: user.name }) };
 * ```
 */
export type SessionHydrationOptions<TUser, TSnapshot> = {
  select: (session: RequestSession<TUser>) => TSnapshot;
};
