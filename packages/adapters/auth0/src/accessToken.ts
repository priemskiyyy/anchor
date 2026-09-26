import type { Auth0AccessToken } from "src/types/Auth0AccessToken";

/**
 * A token profile that mints an access token for one API through
 * `getTokenSilently`, bypassing the client's cache when the caller asks for
 * `forceRefresh`.
 *
 * @example
 * ```ts
 * const adapter = auth0({
 *   sdk: auth0Client,
 *   tokens: { api: accessToken({ audience: "https://api.example.com", scope: "read:projects" }) },
 * });
 * ```
 */
export const accessToken = ({
  audience,
  scope,
}: { audience?: string; scope?: string } = {}): Auth0AccessToken =>
  Object.freeze({
    kind: "access-token",
    ...(audience === undefined ? {} : { audience }),
    ...(scope === undefined ? {} : { scope }),
  });
