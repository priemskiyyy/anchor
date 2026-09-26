import type { KeycloakAccessToken } from "src/types/KeycloakAccessToken";
import { ACCESS_TOKEN_PROFILE } from "src/utils/constants/answers";

/**
 * A token profile that mints the Keycloak access token through
 * `updateToken()`, which refreshes it when it expires within 30 seconds and
 * whenever the caller asks for `forceRefresh`.
 *
 * @example
 * ```ts
 * const adapter = keycloak({ sdk: keycloakInstance, tokens: { api: accessToken() } });
 * ```
 */
export const accessToken = (): KeycloakAccessToken => ACCESS_TOKEN_PROFILE;
