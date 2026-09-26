import type { TokenRequest } from "@priemskiyyy/anchor";

import type { HttpToken } from "src/types/HttpToken";

/**
 * Mints one token profile through your client: from the request's session,
 * with a fresh token when `forceRefresh` is set, and aborting with `signal`.
 *
 * @example
 * ```ts
 * const realtime: HttpTokenMinter = async ({ signal }) => {
 *   const { token, userId } = await api.getRealtimeToken({ signal });
 *
 *   return { value: token, subject: userId };
 * };
 * ```
 */
export type HttpTokenMinter = (
  request: TokenRequest<string>,
) => HttpToken | PromiseLike<HttpToken>;
