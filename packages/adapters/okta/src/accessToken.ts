import type { OktaAccessToken } from "src/types/OktaAccessToken";
import { ACCESS_TOKEN_PROFILE } from "src/utils/constants/answers";

/**
 * A token profile that mints the token manager's access token, renewed
 * through `tokenManager.renew()` when it has expired or the caller asks for
 * `forceRefresh`.
 *
 * @example
 * ```ts
 * const adapter = okta({ sdk: oktaAuth, tokens: { api: accessToken() } });
 * ```
 */
export const accessToken = (): OktaAccessToken => ACCESS_TOKEN_PROFILE;
