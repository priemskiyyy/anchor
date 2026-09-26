import type { RequestSessionState } from "src/types/RequestSessionState";

/**
 * What `getRequestSession()` answers: the request's session state, and the
 * headers to set on the response, empty when the provider wants none.
 *
 * @example
 * ```ts
 * const { state, headers }: RequestSessionResult<User> = await getRequestSession(request, { adapter });
 * ```
 */
export type RequestSessionResult<TUser> = {
  state: RequestSessionState<TUser>;
  headers: Headers;
};
