import type { EndRequest } from "src/types/EndRequest";
import type { EndResult } from "src/types/EndResult";
import type { ReadContext } from "src/types/ReadContext";
import type { SessionAnswer } from "src/types/SessionAnswer";
import type { Token } from "src/types/Token";
import type { TokenRequest } from "src/types/TokenRequest";

/**
 * What an opened adapter can do: read the provider's session, and where the
 * provider supports them, mint tokens, end the session and remove its
 * listeners. A method that is absent is unsupported.
 *
 * @example
 * ```ts
 * const session: AdapterSession<User, never> = {
 *   read: async () => getAnswer(await sdk.getUser()),
 *   dispose: () => unsubscribe(),
 * };
 * ```
 */
export type AdapterSession<TUser, TProfile extends string> = {
  read: (
    context: ReadContext,
  ) => SessionAnswer<TUser> | Promise<SessionAnswer<TUser>>;
  getToken?: (request: TokenRequest<TProfile>) => Token | Promise<Token>;
  end?: (request: EndRequest) => EndResult | Promise<EndResult>;
  dispose?: () => void | Promise<void>;
};
