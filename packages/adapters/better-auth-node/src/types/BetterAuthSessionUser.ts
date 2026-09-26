/**
 * The default user of a Better Auth session: a plain snapshot of the core
 * user fields under Better Auth's names, with `null` for a missing image.
 * Dates and plugin fields stay out; a `user` mapper adds them.
 *
 * @example
 * ```ts
 * const email = state.status === "signed-in" ? state.session.user.email : null;
 * ```
 */
export type BetterAuthSessionUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
};
