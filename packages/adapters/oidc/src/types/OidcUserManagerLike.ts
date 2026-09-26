import type { OidcUserLike } from "src/types/OidcUserLike";

/**
 * The parts of the oidc-client-ts `UserManager` the adapter calls. Pass the
 * `UserManager` your application configured; the adapter never creates it,
 * never handles a callback and never redirects.
 *
 * @example
 * ```ts
 * const sdk: OidcUserManagerLike = new UserManager({ authority, client_id, redirect_uri });
 * ```
 */
export type OidcUserManagerLike = {
  events: {
    addUserLoaded: (callback: (user: OidcUserLike) => void) => () => void;
    addUserUnloaded: (callback: () => void) => () => void;
    addUserSignedOut: (callback: () => void) => () => void;
  };
  settings: {
    client_id: string;
    post_logout_redirect_uri?: string | undefined;
    extraQueryParams: Record<string, string | number | boolean>;
  };
  metadataService: {
    getEndSessionEndpoint: () => Promise<string | undefined>;
  };
  getUser: () => Promise<OidcUserLike | null>;
  signinSilent: () => Promise<OidcUserLike | null>;
  removeUser: () => Promise<void>;
};
