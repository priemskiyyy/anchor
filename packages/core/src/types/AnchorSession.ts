import type { EndResult } from "src/types/EndResult";
import type { GetTokenOptions } from "src/types/GetTokenOptions";
import type { Principal } from "src/types/Principal";
import type { Token } from "src/types/Token";

/**
 * One accepted session. Its `key` changes exactly when the security context
 * does, and `getToken` and `end` belong to it: once it is replaced or ended,
 * they mint and end nothing.
 *
 * @example
 * ```ts
 * const state = anchor.session.get();
 *
 * if (state.status === "signed-in") {
 *   const token = await state.session.getToken("api");
 * }
 * ```
 */
export type AnchorSession<TUser, TProfile extends string> = {
  /** Anchor's random key for this security context, safe as a storage or cache scope. */
  key: string;
  principal: Principal;
  /** A frozen copy of the plain data the adapter mapped the provider's user to. */
  user: TUser;
  /** The provider's anonymous or guest session, such as a Firebase anonymous user. */
  guest: boolean;
  /** Someone else is acting as this user, such as a Clerk actor. */
  impersonated: boolean;
  /** Mints a token of one declared profile for this session, and rejects once the session is replaced or ended. */
  getToken: (profile: TProfile, options?: GetTokenOptions) => Promise<Token>;
  /** Ends this session in this application, never every device or the identity provider. */
  end: () => Promise<EndResult>;
};
