import type { AmplifyLike } from "src/types/AmplifyLike";

/**
 * The user type `getCurrentUser()` answers for the Amplify functions given,
 * which a `user` mapper receives.
 *
 * @example
 * ```ts
 * type User = AmplifyUserOf<{ auth: typeof auth; hub: typeof Hub }>;
 * ```
 */
export type AmplifyUserOf<TSdk extends AmplifyLike> = Awaited<
  ReturnType<TSdk["auth"]["getCurrentUser"]>
>;
