import type { SessionAnswer } from "@priemskiyyy/anchor";

import type { ServerSessionRequest } from "src/types/ServerSessionRequest";

/**
 * A provider's server SDK behind one request-scoped read. It holds no state
 * between requests: every read answers from the request it is given, under
 * the client's `SessionAnswer` contract, and sets the headers the provider
 * wants on the response in `responseHeaders`.
 *
 * @example
 * ```ts
 * const adapter: ServerSessionAdapter<User, typeof auth> = betterAuth({ sdk: auth });
 * ```
 */
export type ServerSessionAdapter<TUser = unknown, TNative = unknown> = {
  name: string;
  /** The application's own server SDK. */
  native: TNative;
  read: (
    request: ServerSessionRequest,
  ) => SessionAnswer<TUser> | Promise<SessionAnswer<TUser>>;
};
