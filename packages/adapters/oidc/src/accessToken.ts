import type { OidcAccessToken } from "src/types/OidcAccessToken";
import { ACCESS_TOKEN_PROFILE } from "src/utils/constants/answers";

/**
 * A token profile that mints the user's access token, renewed through
 * `signinSilent()` when it has expired or the caller asks for `forceRefresh`.
 *
 * @example
 * ```ts
 * const adapter = oidc({ sdk: userManager, tokens: { api: accessToken() } });
 * ```
 */
export const accessToken = (): OidcAccessToken => ACCESS_TOKEN_PROFILE;
