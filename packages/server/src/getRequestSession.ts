import { Anchor } from "@priemskiyyy/anchor";

import type { RequestSessionOptions } from "src/types/RequestSessionOptions";
import type { RequestSessionResult } from "src/types/RequestSessionResult";
import { getRequestSessionState } from "src/utils/getRequestSessionState";

/**
 * Reads the session of one request through a server adapter and answers its
 * state with the headers the provider wants set on the response, such as a
 * refreshed session cookie, even when the read failed. Each call reads on its
 * own, with no observer and nothing shared between requests, and a provider
 * that cannot tell answers `unavailable`, never `signed-out`.
 *
 * @example
 * ```ts
 * const { state, headers } = await getRequestSession(request, { adapter: betterAuth({ sdk: auth }) });
 *
 * return new Response(render(state), { headers });
 * ```
 */
export const getRequestSession = async <TUser, TNative>(
  { url, method, headers }: Pick<Request, "url" | "method" | "headers">,
  { adapter, timeout }: RequestSessionOptions<TUser, TNative>,
): Promise<RequestSessionResult<TUser>> => {
  const responseHeaders = new Headers();

  // A throwaway Anchor gives one read the client's answer checks, timeout and error codes.
  const anchor = new Anchor({
    adapter: {
      name: adapter.name,
      native: adapter.native,
      tokens: {},
      open: () => ({
        read: async ({ signal }) =>
          adapter.read({ url, method, headers, responseHeaders, signal }),
      }),
    },
    ...(timeout === undefined ? {} : { timeout }),
  });

  await anchor.start();

  // A copy, so a read that outlives its timeout cannot change the headers of a response already on its way.
  return Object.freeze({
    state: getRequestSessionState(anchor.session.get()),
    headers: new Headers(responseHeaders),
  });
};
