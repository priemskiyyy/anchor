import type { MsalLike } from "src/types/MsalLike";

/**
 * The account type of an MSAL.js client, which a `user` mapper receives.
 *
 * @example
 * ```ts
 * type Account = MsalAccountOf<PublicClientApplication>;
 * ```
 */
export type MsalAccountOf<TClient extends MsalLike> = NonNullable<
  ReturnType<TClient["getActiveAccount"]>
>;
