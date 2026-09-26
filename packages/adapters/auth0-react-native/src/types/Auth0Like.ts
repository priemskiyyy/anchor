/**
 * The parts of the react-native-auth0 `Auth0` client the adapter calls: its
 * credentials manager. Pass the client `new Auth0()` returned; the adapter
 * never logs anyone in, never saves credentials and never opens a browser.
 *
 * @example
 * ```ts
 * const sdk: Auth0Like = new Auth0({ domain, clientId });
 * ```
 */
export type Auth0Like = {
  credentialsManager: {
    hasValidCredentials: (minTtl?: number) => Promise<boolean>;
    /** Answers the stored credentials, renewed first when their access token expired, when forced or when the scope differs. */
    getCredentials: (
      scope?: string,
      minTtl?: number,
      parameters?: Record<string, unknown>,
      forceRefresh?: boolean,
    ) => Promise<{ idToken: string; accessToken: string; tokenType: string }>;
    /** Answers the access token for one API, exchanged with the refresh token and cached per audience and scope. */
    getApiCredentials: (
      audience: string,
      scope?: string,
    ) => Promise<{ accessToken: string; tokenType: string }>;
    clearApiCredentials: (audience: string, scope?: string) => Promise<void>;
    clearCredentials: () => Promise<void>;
  };
};
