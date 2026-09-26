import type { EndRequest, ReadContext } from "@priemskiyyy/anchor";

import type { HttpSessionAnswer } from "src/types/HttpSessionAnswer";
import type { HttpTokenMinter } from "src/types/HttpTokenMinter";

/**
 * Options of `http()`. Your own client owns the transport: the address,
 * cookies, authentication, retries and response validation. The adapter only
 * maps its answers onto the session contract.
 *
 * @example
 * ```ts
 * const options: HttpAdapterOptions<User, "realtime"> = {
 *   authority: "https://api.example.com",
 *   read: async ({ signal }) => api.getSession({ signal }),
 *   end: async ({ session, signal }) => {
 *     await api.endSession(session.context, { signal });
 *   },
 *   tokens: { realtime: async ({ signal }) => api.getRealtimeToken({ signal }) },
 * };
 * ```
 */
export type HttpAdapterOptions<TUser, TProfile extends string> = {
  /** Names your backend, the authority of every principal it vouches for, such as its origin. */
  authority: string;
  /** Reads the current session. Answer `null` only on your server's positive word that there is none, such as a 401, and throw when it cannot tell. */
  read: (
    context: ReadContext,
  ) =>
    | HttpSessionAnswer<TUser>
    | null
    | PromiseLike<HttpSessionAnswer<TUser> | null>;
  /** Ends exactly the session the request names, on your server; resolve once it has. Without it, `session.end()` rejects with `UNSUPPORTED`. */
  end?: (request: EndRequest) => void | PromiseLike<void>;
  /** The token profiles, each the function that mints it. */
  tokens?: Record<TProfile, HttpTokenMinter>;
};
