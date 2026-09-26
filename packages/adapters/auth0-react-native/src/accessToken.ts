import type { Auth0AccessToken } from "src/types/Auth0AccessToken";

/**
 * A token profile that mints an access token through the credentials
 * manager: for one API through `getApiCredentials` when it names an
 * audience, the login's own through `getCredentials` when it does not.
 *
 * @example
 * ```ts
 * const adapter = auth0({
 *   sdk: client,
 *   domain,
 *   parseIdToken,
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
