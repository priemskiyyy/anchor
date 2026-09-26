import type { Auth0ClaimsLike } from "src/types/Auth0ClaimsLike";

/**
 * The parts of the auth0-spa-js `Auth0Client` the adapter calls. Pass the
 * client `createAuth0Client()` returned; the adapter never creates it, never
 * handles a redirect and never logs anyone in.
 *
 * @example
 * ```ts
 * const sdk: Auth0ClientLike = await createAuth0Client({ domain, clientId });
 * ```
 */
export type Auth0ClientLike = {
  getIdTokenClaims: () => Promise<Auth0ClaimsLike | undefined>;
  getTokenSilently: (options: {
    authorizationParams: { audience?: string; scope?: string };
    cacheMode: "on" | "off";
    detailedResponse: true;
  }) => Promise<{ access_token: string; token_type: string } | undefined>;
  logout: (options: {
    openUrl: (url: string) => void;
    logoutParams?: { returnTo?: string };
  }) => Promise<void>;
};
