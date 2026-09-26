import type { MsalAccessToken } from "src/types/MsalAccessToken";

/**
 * A token profile that mints an access token for one set of scopes through
 * `acquireTokenSilent`, for the session's own account, skipping MSAL's cache
 * when the caller asks for `forceRefresh`.
 *
 * @example
 * ```ts
 * const adapter = msal({
 *   sdk: msalInstance,
 *   tokens: { graph: accessToken({ scopes: ["User.Read"] }) },
 * });
 * ```
 */
export const accessToken = ({
  scopes,
}: {
  scopes: string[];
}): MsalAccessToken => {
  const copied = [...scopes];

  Object.freeze(copied);

  return Object.freeze({ kind: "access-token", scopes: copied });
};
