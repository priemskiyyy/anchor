import type { KeycloakTokenParsedLike } from "src/types/KeycloakTokenParsedLike";

/**
 * The parts of a keycloak-js `Keycloak` instance the adapter reads, chains and
 * calls. Pass the instance your application created; the adapter never calls
 * `init()`, `login()` or `logout()`, and chains the callbacks you assigned
 * instead of replacing them.
 *
 * @example
 * ```ts
 * const sdk: KeycloakLike = new Keycloak({ url, realm, clientId });
 * ```
 */
export type KeycloakLike = {
  /** Whether `init()` was called; keycloak-js sets it as `init()` begins, not when it finishes. */
  didInitialize: boolean;
  token?: string | undefined;
  tokenParsed?: KeycloakTokenParsedLike | undefined;
  refreshToken?: string | undefined;
  /** Called once `init()` finished; like every callback here, chained and restored, never replaced. */
  onReady?: ((authenticated?: boolean) => void) | undefined;
  onAuthSuccess?: ((authenticated?: boolean) => void) | undefined;
  onAuthRefreshSuccess?: ((authenticated?: boolean) => void) | undefined;
  onAuthLogout?: ((authenticated?: boolean) => void) | undefined;
  updateToken: (minValidity: number) => Promise<boolean>;
  createLogoutUrl: (options: { logoutMethod: "GET" }) => string;
  clearToken: () => void;
};
