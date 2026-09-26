import type { WorkosAccessToken } from "src/types/WorkosAccessToken";
import { ACCESS_TOKEN_PROFILE } from "src/utils/constants/answers";

/**
 * A token profile that mints the AuthKit access token through
 * `getAccessToken()`, which refreshes it when it is about to expire or the
 * caller asks for `forceRefresh`.
 *
 * @example
 * ```ts
 * const adapter = workos({ sdk: client, refreshes, tokens: { api: accessToken() } });
 * ```
 */
export const accessToken = (): WorkosAccessToken => ACCESS_TOKEN_PROFILE;
